const express = require('express');
const {
  serveAssetRaw,
  serveAssetThumb,
  deleteAsset,
} = require('../controllers/assetController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Every route here is behind auth, and each handler additionally checks that
// the asset's workspace belongs to the caller. Files are evidence - a guessable
// URL should never be enough to read one.
router.use(protect);

router.get('/:id/raw', serveAssetRaw);
router.get('/:id/thumb', serveAssetThumb);
router.delete('/:id', deleteAsset);

module.exports = router;
