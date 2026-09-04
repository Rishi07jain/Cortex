const asyncHandler = require('../middleware/asyncHandler');
const Workspace = require('../models/Workspace');
const Canvas = require('../models/Canvas');
const Node = require('../models/Node');
const Edge = require('../models/Edge');
const Group = require('../models/Group');
const Asset = require('../models/Asset');

/** Loads a workspace and enforces that it belongs to the signed-in user. */
async function findOwnedWorkspace(id, userId, res) {
  const workspace = await Workspace.findOne({ _id: id, owner: userId });
  if (!workspace) {
    res.status(404);
    throw new Error('Workspace not found');
  }
  return workspace;
}

// @desc   List the user's workspaces with canvas counts
// @route  GET /api/workspaces
// @access Private
const getWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await Workspace.find({ owner: req.user._id }).sort({ createdAt: 1 }).lean();

  const withCounts = await Promise.all(
    workspaces.map(async (ws) => ({
      ...ws,
      canvasCount: await Canvas.countDocuments({ workspace: ws._id, isArchived: false }),
    }))
  );

  res.json(withCounts);
});

// @desc   Create a workspace
// @route  POST /api/workspaces
// @access Private
const createWorkspace = asyncHandler(async (req, res) => {
  const { name, description, color } = req.body;

  if (!name?.trim()) {
    res.status(400);
    throw new Error('Workspace name is required');
  }

  const workspace = await Workspace.create({
    name: name.trim(),
    description: description || '',
    color: color || undefined,
    owner: req.user._id,
  });

  res.status(201).json({ ...workspace.toObject(), canvasCount: 0 });
});

// @desc   Get one workspace
// @route  GET /api/workspaces/:id
// @access Private
const getWorkspace = asyncHandler(async (req, res) => {
  const workspace = await findOwnedWorkspace(req.params.id, req.user._id, res);
  res.json(workspace);
});

// @desc   Rename / recolour a workspace
// @route  PUT /api/workspaces/:id
// @access Private
const updateWorkspace = asyncHandler(async (req, res) => {
  const workspace = await findOwnedWorkspace(req.params.id, req.user._id, res);
  const { name, description, color } = req.body;

  if (name !== undefined) workspace.name = name;
  if (description !== undefined) workspace.description = description;
  if (color !== undefined) workspace.color = color;

  await workspace.save();
  res.json(workspace);
});

// @desc   Delete a workspace and everything inside it
// @route  DELETE /api/workspaces/:id
// @access Private
const deleteWorkspace = asyncHandler(async (req, res) => {
  const workspace = await findOwnedWorkspace(req.params.id, req.user._id, res);

  const canvases = await Canvas.find({ workspace: workspace._id }).select('_id').lean();
  const canvasIds = canvases.map((c) => c._id);

  await Promise.all([
    Node.deleteMany({ canvas: { $in: canvasIds } }),
    Edge.deleteMany({ canvas: { $in: canvasIds } }),
    Group.deleteMany({ canvas: { $in: canvasIds } }),
    // Asset rows would otherwise be orphaned (files on disk are cleaned in Step 3).
    Asset.deleteMany({ workspace: workspace._id }),
  ]);
  await Canvas.deleteMany({ _id: { $in: canvasIds } });
  await workspace.deleteOne();

  res.json({ message: 'Workspace deleted', id: req.params.id });
});

module.exports = {
  getWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  findOwnedWorkspace,
};