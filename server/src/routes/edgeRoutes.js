const express = require('express');
const { createEdge, updateEdge, deleteEdge } = require('../controllers/edgeController');

// mergeParams lets this router read :canvasId from the parent canvas router.
const router = express.Router({ mergeParams: true });

router.route('/').post(createEdge);
router.route('/:edgeId').put(updateEdge).delete(deleteEdge);

module.exports = router;