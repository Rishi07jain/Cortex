const asyncHandler = require('./asyncHandler');
const Canvas = require('../models/Canvas');

/**
 * Loads the canvas named by :canvasId (or :id) and enforces ownership, so every
 * nested node/edge/asset route inherits the check instead of repeating it.
 * A malformed id throws a CastError, which the error handler turns into a 404 -
 * the same answer as "not yours", so we never leak which canvases exist.
 */
const loadCanvas = asyncHandler(async (req, res, next) => {
  const canvasId = req.params.canvasId || req.params.id;

  const canvas = await Canvas.findOne({ _id: canvasId, owner: req.user._id });
  if (!canvas) {
    res.status(404);
    throw new Error('Canvas not found');
  }

  req.canvas = canvas;
  return next();
});

module.exports = { loadCanvas };