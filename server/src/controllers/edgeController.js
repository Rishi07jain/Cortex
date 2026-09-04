const asyncHandler = require('../middleware/asyncHandler');
const Edge = require('../models/Edge');
const Node = require('../models/Node');

// @desc   Connect two nodes
// @route  POST /api/canvases/:canvasId/edges
// @access Private
const createEdge = asyncHandler(async (req, res) => {
  const { source, target, label, relationshipType, direction, style, confidence, metadata } =
    req.body;

  if (!source || !target) {
    res.status(400);
    throw new Error('An edge needs both a source and a target node');
  }
  if (String(source) === String(target)) {
    res.status(400);
    throw new Error('A node cannot be connected to itself');
  }

  // Both endpoints must live on THIS canvas - otherwise a crafted request could
  // stitch together nodes from a canvas the user does not own.
  const found = await Node.countDocuments({
    _id: { $in: [source, target] },
    canvas: req.canvas._id,
  });
  if (found !== 2) {
    res.status(404);
    throw new Error('Node not found on this canvas');
  }

  const edge = await Edge.create({
    canvas: req.canvas._id,
    source,
    target,
    label: label || '',
    ...(relationshipType ? { relationshipType } : {}),
    ...(direction ? { direction } : {}),
    ...(style ? { style } : {}),
    ...(confidence !== undefined ? { confidence } : {}),
    // Remembers which side of each node the line was drawn from, so a reload
    // redraws the connection exactly where the user put it.
    ...(metadata ? { metadata } : {}),
  });

  res.status(201).json(edge);
});

// @desc   Update an edge's label / type / styling
// @route  PUT /api/canvases/:canvasId/edges/:edgeId
// @access Private
const updateEdge = asyncHandler(async (req, res) => {
  const edge = await Edge.findOne({ _id: req.params.edgeId, canvas: req.canvas._id });
  if (!edge) {
    res.status(404);
    throw new Error('Connection not found');
  }

  const { label, relationshipType, direction, style, confidence, isSuggestion, metadata } =
    req.body;

  if (label !== undefined) edge.label = label;
  if (relationshipType !== undefined) edge.relationshipType = relationshipType;
  if (direction !== undefined) edge.direction = direction;
  if (confidence !== undefined) edge.confidence = confidence;
  if (isSuggestion !== undefined) edge.isSuggestion = isSuggestion;
  if (metadata !== undefined) {
    // Mixed paths need an explicit dirty flag or Mongoose won't persist them.
    edge.metadata = { ...(edge.metadata || {}), ...metadata };
    edge.markModified('metadata');
  }
  if (style) {
    edge.style.color = style.color ?? edge.style.color;
    edge.style.thickness = style.thickness ?? edge.style.thickness;
    edge.style.dashed = style.dashed ?? edge.style.dashed;
  }

  await edge.save();
  res.json(edge);
});

// @desc   Delete an edge
// @route  DELETE /api/canvases/:canvasId/edges/:edgeId
// @access Private
const deleteEdge = asyncHandler(async (req, res) => {
  const edge = await Edge.findOne({ _id: req.params.edgeId, canvas: req.canvas._id });
  if (!edge) {
    res.status(404);
    throw new Error('Connection not found');
  }

  await edge.deleteOne();
  res.json({ message: 'Connection deleted', id: req.params.edgeId });
});

module.exports = { createEdge, updateEdge, deleteEdge };