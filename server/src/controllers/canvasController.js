const asyncHandler = require('../middleware/asyncHandler');
const Canvas = require('../models/Canvas');
const Workspace = require('../models/Workspace');
const Node = require('../models/Node');
const Edge = require('../models/Edge');
const Group = require('../models/Group');
const Asset = require('../models/Asset');

/** Loads a canvas and enforces that it belongs to the signed-in user. */
async function findOwnedCanvas(id, userId, res) {
  const canvas = await Canvas.findOne({ _id: id, owner: userId });
  if (!canvas) {
    res.status(404);
    throw new Error('Canvas not found');
  }
  return canvas;
}

// @desc   List canvases (optionally filtered by ?workspace=<id>)
// @route  GET /api/canvases
// @access Private
const getCanvases = asyncHandler(async (req, res) => {
  const filter = { owner: req.user._id, isArchived: false };
  if (req.query.workspace) filter.workspace = req.query.workspace;

  const canvases = await Canvas.find(filter).sort({ lastOpenedAt: -1 }).lean();

  const withCounts = await Promise.all(
    canvases.map(async (c) => ({
      ...c,
      nodeCount: await Node.countDocuments({ canvas: c._id }),
      edgeCount: await Edge.countDocuments({ canvas: c._id }),
    }))
  );

  res.json(withCounts);
});

// @desc   Create a canvas
// @route  POST /api/canvases
// @access Private
const createCanvas = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  let { workspace: workspaceId } = req.body;

  // No workspace passed? Fall back to the user's first one.
  if (!workspaceId) {
    const first = await Workspace.findOne({ owner: req.user._id }).sort({ createdAt: 1 });
    if (!first) {
      res.status(400);
      throw new Error('Create a workspace first');
    }
    workspaceId = first._id;
  } else {
    const owned = await Workspace.findOne({ _id: workspaceId, owner: req.user._id });
    if (!owned) {
      res.status(404);
      throw new Error('Workspace not found');
    }
  }

  const canvas = await Canvas.create({
    name: name?.trim() || 'Untitled canvas',
    description: description || '',
    workspace: workspaceId,
    owner: req.user._id,
  });

  res.status(201).json({ ...canvas.toObject(), nodeCount: 0, edgeCount: 0 });
});

// @desc   Get one canvas and stamp lastOpenedAt
// @route  GET /api/canvases/:id
// @access Private
const getCanvas = asyncHandler(async (req, res) => {
  const canvas = await findOwnedCanvas(req.params.id, req.user._id, res);

  canvas.lastOpenedAt = new Date();
  await canvas.save();

  res.json(canvas);
});

// @desc   Everything needed to render a canvas, in one round trip
// @route  GET /api/canvases/:id/graph
// @access Private
const getCanvasGraph = asyncHandler(async (req, res) => {
  const canvas = req.canvas; // loaded + ownership-checked by loadCanvas

  const [nodes, edges] = await Promise.all([
    Node.find({ canvas: canvas._id }).lean(),
    Edge.find({ canvas: canvas._id }).lean(),
  ]);

  // Opening a canvas counts as using it - keeps the dashboard ordered sensibly.
  canvas.lastOpenedAt = new Date();
  await canvas.save();

  res.json({ canvas, nodes, edges });
});

// @desc   Update canvas name / description / viewport
// @route  PUT /api/canvases/:id
// @access Private
const updateCanvas = asyncHandler(async (req, res) => {
  const canvas = await findOwnedCanvas(req.params.id, req.user._id, res);
  const { name, description, viewport, isArchived } = req.body;

  if (name !== undefined) canvas.name = name;
  if (description !== undefined) canvas.description = description;
  if (isArchived !== undefined) canvas.isArchived = isArchived;
  if (viewport) {
    canvas.viewport = {
      x: viewport.x ?? canvas.viewport.x,
      y: viewport.y ?? canvas.viewport.y,
      zoom: viewport.zoom ?? canvas.viewport.zoom,
    };
  }

  await canvas.save();
  res.json(canvas);
});

// @desc   Delete a canvas and its nodes/edges/groups
// @route  DELETE /api/canvases/:id
// @access Private
const deleteCanvas = asyncHandler(async (req, res) => {
  const canvas = await findOwnedCanvas(req.params.id, req.user._id, res);

  await Promise.all([
    Node.deleteMany({ canvas: canvas._id }),
    Edge.deleteMany({ canvas: canvas._id }),
    Group.deleteMany({ canvas: canvas._id }),
    Asset.deleteMany({ canvas: canvas._id }),
  ]);
  await canvas.deleteOne();

  res.json({ message: 'Canvas deleted', id: req.params.id });
});

module.exports = {
  getCanvases,
  createCanvas,
  getCanvas,
  getCanvasGraph,
  updateCanvas,
  deleteCanvas,
  findOwnedCanvas,
};