const express = require('express');
const {
  createNode,
  updateNode,
  bulkUpdateNodes,
  deleteNode,
} = require('../controllers/nodeController');

// mergeParams lets this router read :canvasId from the parent canvas router.
const router = express.Router({ mergeParams: true });

router.route('/').post(createNode).patch(bulkUpdateNodes);
router.route('/:nodeId').put(updateNode).delete(deleteNode);

module.exports = router;