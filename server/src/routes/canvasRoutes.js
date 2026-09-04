const express = require('express');
const {
  getCanvases,
  createCanvas,
  getCanvas,
  getCanvasGraph,
  updateCanvas,
  deleteCanvas,
} = require('../controllers/canvasController');
const { uploadAsset, createLinkNode } = require('../controllers/assetController');
const { protect } = require('../middleware/auth');
const { loadCanvas } = require('../middleware/canvasAccess');
const { upload } = require('../config/upload');
const nodeRoutes = require('./nodeRoutes');
const edgeRoutes = require('./edgeRoutes');

const router = express.Router();

router.use(protect);

router.route('/').get(getCanvases).post(createCanvas);

// Everything below :id is scoped to one canvas, so loadCanvas does the ownership
// check once and the nested routers inherit it via req.canvas.
router.get('/:id/graph', loadCanvas, getCanvasGraph);

router.use('/:canvasId/nodes', loadCanvas, nodeRoutes);
router.use('/:canvasId/edges', loadCanvas, edgeRoutes);

// Uploads and links both create a node, so they live under the canvas too.
// loadCanvas runs before multer: an upload to someone else's canvas is rejected
// before a single byte is written to disk.
router.post('/:canvasId/assets', loadCanvas, upload.single('file'), uploadAsset);
router.post('/:canvasId/links', loadCanvas, createLinkNode);

router.route('/:id').get(getCanvas).put(updateCanvas).delete(deleteCanvas);

module.exports = router;
