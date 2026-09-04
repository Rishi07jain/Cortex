const express = require('express');
const {
  getWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
} = require('../controllers/workspaceController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // everything below requires a session

router.route('/').get(getWorkspaces).post(createWorkspace);
router.route('/:id').get(getWorkspace).put(updateWorkspace).delete(deleteWorkspace);

module.exports = router;
