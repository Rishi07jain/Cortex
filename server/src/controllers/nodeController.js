const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const Node = require('../models/Node');
const Edge = require('../models/Edge');

// @desc   Create a node on a canvas
// @route  POST /api/canvases/:canvasId/nodes
// @access Private
const createNode = asyncHandler(async (req, res) => {
  const {
    type,
    intent,
    title,
    content,
    position,
    size,
    style,
    tags,
    metadata,
    asset,
    group,
    dueDate,
  } = req.body;

  const node = await Node.create({
    canvas: req.canvas._id,
    type: type || 'note',
    ...(intent ? { intent } : {}),
    title: title || '',
    content: content || '',
    position: { x: position?.x ?? 0, y: position?.y ?? 0 },
    ...(size ? { size: { width: size.width, height: size.height } } : {}),
    ...(style ? { style } : {}),
    ...(Array.isArray(tags) ? { tags } : {}),
    ...(metadata ? { metadata } : {}),
    ...(asset ? { asset } : {}),
    ...(group ? { group } : {}),
    ...(dueDate !== undefined ? { dueDate: dueDate || '' } : {}),
  });

  res.status(201).json(node);
});

// @desc   Update one node
// @route  PUT /api/canvases/:canvasId/nodes/:nodeId
// @access Private
const updateNode = asyncHandler(async (req, res) => {
  const node = await Node.findOne({ _id: req.params.nodeId, canvas: req.canvas._id });
  if (!node) {
    res.status(404);
    throw new Error('Node not found');
  }

  const {
    type,
    intent,
    title,
    content,
    position,
    size,
    style,
    tags,
    metadata,
    collapsed,
    group,
    done,
    dueDate,
    confidence,
  } = req.body;

  if (type !== undefined) node.type = type;
  if (intent !== undefined) node.intent = intent;
  if (title !== undefined) node.title = title;
  if (content !== undefined) node.content = content;
  if (collapsed !== undefined) node.collapsed = collapsed;
  if (group !== undefined) node.group = group || null;
  if (Array.isArray(tags)) node.tags = tags;
  // '' clears the date. undefined leaves it alone. The two are different and
  // the client relies on that to remove a due date without wiping other fields.
  if (dueDate !== undefined) node.dueDate = dueDate || '';
  if (confidence !== undefined) node.confidence = Number(confidence) || 0;

  if (done !== undefined) {
    const next = Boolean(done);
    // Only stamp doneAt on an actual transition, so re-ticking an already-done
    // node doesn't rewrite when you finished it.
    if (next !== node.done) node.doneAt = next ? new Date() : null;
    node.done = next;
  }

  if (position) {
    node.position.x = position.x ?? node.position.x;
    node.position.y = position.y ?? node.position.y;
  }
  if (size) {
    node.size.width = size.width ?? node.size.width;
    node.size.height = size.height ?? node.size.height;
  }
  if (style) {
    node.style.color = style.color ?? node.style.color;
  }
  // Mixed paths need an explicit dirty flag or Mongoose won't persist them.
  if (metadata !== undefined) {
    node.metadata = { ...(node.metadata || {}), ...metadata };
    node.markModified('metadata');
  }

  await node.save();
  res.json(node);
});

// @desc   Bulk-patch node geometry - one request for a whole drag/resize batch
// @route  PATCH /api/canvases/:canvasId/nodes
// @access Private
const bulkUpdateNodes = asyncHandler(async (req, res) => {
  const updates = Array.isArray(req.body.updates) ? req.body.updates : [];

  const ops = updates
    // Skip junk ids rather than letting a CastError abort the whole batch.
    .filter((u) => u && mongoose.isValidObjectId(u.id))
    .map((u) => {
      const $set = {};
      if (u.position) {
        if (typeof u.position.x === 'number') $set['position.x'] = u.position.x;
        if (typeof u.position.y === 'number') $set['position.y'] = u.position.y;
      }
      if (u.size) {
        // Guard the floor here too: a resize batch is the one path that can
        // write a size the UI's minWidth/minHeight never produced.
        if (typeof u.size.width === 'number') $set['size.width'] = Math.max(80, u.size.width);
        if (typeof u.size.height === 'number') $set['size.height'] = Math.max(60, u.size.height);
      }
      return { $set, id: u.id };
    })
    .filter((u) => Object.keys(u.$set).length > 0)
    .map((u) => ({
      updateOne: {
        // canvas in the filter keeps the ownership check on every single write.
        filter: { _id: u.id, canvas: req.canvas._id },
        update: { $set: u.$set },
      },
    }));

  if (!ops.length) return res.json({ updated: 0 });

  const result = await Node.bulkWrite(ops);
  return res.json({ updated: result.modifiedCount ?? 0 });
});

// @desc   Delete a node and any edges touching it
// @route  DELETE /api/canvases/:canvasId/nodes/:nodeId
// @access Private
const deleteNode = asyncHandler(async (req, res) => {
  const node = await Node.findOne({ _id: req.params.nodeId, canvas: req.canvas._id });
  if (!node) {
    res.status(404);
    throw new Error('Node not found');
  }

  // Orphaned edges would render as dangling lines, so they go too.
  await Edge.deleteMany({
    canvas: req.canvas._id,
    $or: [{ source: node._id }, { target: node._id }],
  });
  await node.deleteOne();

  res.json({ message: 'Node deleted', id: req.params.nodeId });
});

module.exports = { createNode, updateNode, bulkUpdateNodes, deleteNode };
