const fs = require('fs/promises');
const path = require('path');

const asyncHandler = require('../middleware/asyncHandler');
const Asset = require('../models/Asset');
const Node = require('../models/Node');
const Edge = require('../models/Edge');
const Workspace = require('../models/Workspace');
const { kindForMime, UPLOAD_DIR, THUMB_DIR } = require('../config/upload');
const { processUpload } = require('../services/thumbnails');
const { fetchLinkPreview } = require('../services/linkPreview');

// Which canvas node type each uploaded file becomes.
const KIND_TO_NODE_TYPE = {
  image: 'image',
  pdf: 'file',
  video: 'video',
  audio: 'file',
  file: 'file',
};

/**
 * Opening size per kind. PDFs get a small portrait rectangle so a board of
 * documents stays scannable; images open at their own aspect ratio, capped.
 */
function nodeSizeFor(kind, metadata = {}) {
  if (kind === 'image' && metadata.width && metadata.height) {
    const maxW = 320;
    const maxH = 300;
    const scale = Math.min(maxW / metadata.width, maxH / metadata.height, 1);
    return {
      width: Math.max(120, Math.round(metadata.width * scale)),
      height: Math.max(90, Math.round(metadata.height * scale)),
    };
  }

  if (kind === 'image') return { width: 280, height: 220 };
  if (kind === 'pdf') return { width: 200, height: 250 };
  if (kind === 'video') return { width: 320, height: 220 };
  return { width: 250, height: 92 }; // audio and generic files: a compact row
}

/** Removes an uploaded file we've decided not to keep. Never throws. */
async function discard(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
    /* already gone, or never written */
  }
}

/**
 * Confirms the signed-in user owns the workspace an asset belongs to.
 * Returns null rather than throwing so callers choose the status code.
 */
async function ownedAsset(assetId, userId) {
  const asset = await Asset.findById(assetId);
  if (!asset) return null;

  const workspace = await Workspace.findOne({ _id: asset.workspace, owner: userId });
  return workspace ? asset : null;
}

// @desc   Upload a file and drop it on the canvas as a node
// @route  POST /api/canvases/:canvasId/assets
// @access Private
const uploadAsset = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file was uploaded');
  }

  const kind = kindForMime(req.file.mimetype);
  if (!kind) {
    await discard(req.file.path);
    res.status(415);
    throw new Error(`Unsupported file type: ${req.file.mimetype}`);
  }

  // Thumbnails and text extraction. Degrades to empty values, never throws.
  const { thumbnailFile, metadata, extractedText } = await processUpload({
    filePath: req.file.path,
    mimeType: req.file.mimetype,
    kind,
  });

  // new + save (rather than create) so the _id exists before we build the URL.
  const asset = new Asset({
    workspace: req.canvas.workspace,
    canvas: req.canvas._id,
    uploader: req.user._id,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: '',
    thumbnailUrl: '',
    processingStatus: 'ready',
    extractedText: extractedText || '',
    metadata: { ...metadata, kind, thumbnailFile: thumbnailFile || '' },
  });

  asset.url = `/api/assets/${asset._id}/raw`;
  asset.thumbnailUrl = thumbnailFile ? `/api/assets/${asset._id}/thumb` : '';
  await asset.save();

  const position = {
    x: Number(req.body.x) || 0,
    y: Number(req.body.y) || 0,
  };

  const node = await Node.create({
    canvas: req.canvas._id,
    type: KIND_TO_NODE_TYPE[kind] || 'file',
    title: req.file.originalname,
    position,
    size: nodeSizeFor(kind, metadata),
    asset: asset._id,
    metadata: {
      kind,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: asset.url,
      thumbnailUrl: asset.thumbnailUrl,
      originalName: req.file.originalname,
      pageCount: metadata.pageCount,
    },
  });

  res.status(201).json({ node, asset });
});

// @desc   Create a link node, with preview metadata if the page offers any
// @route  POST /api/canvases/:canvasId/links
// @access Private
const createLinkNode = asyncHandler(async (req, res) => {
  const preview = await fetchLinkPreview(req.body.url); // throws 400 on unsafe URLs

  const hasImage = Boolean(preview.image);

  const node = await Node.create({
    canvas: req.canvas._id,
    type: 'link',
    title: preview.title || preview.domain,
    content: preview.description || '',
    position: { x: Number(req.body.x) || 0, y: Number(req.body.y) || 0 },
    size: hasImage ? { width: 300, height: 260 } : { width: 300, height: 130 },
    metadata: {
      kind: 'link',
      url: preview.url,
      domain: preview.domain,
      siteName: preview.siteName,
      image: preview.image,
      favicon: preview.favicon,
    },
  });

  res.status(201).json({ node });
});

/**
 * Content-Security-Policy for a served file.
 *
 * SVG and text/* are the genuine XSS vectors here: opened directly in a tab
 * they become documents that can run script on the API's origin. Those get a
 * full sandbox. PDFs deliberately do not - the browser's built-in viewer is a
 * scripted document, and sandboxing it breaks the click-to-open behaviour that
 * is the whole point of a PDF node.
 */
function cspFor(mimeType) {
  if (mimeType === 'image/svg+xml' || mimeType.startsWith('text/')) {
    return "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  }
  if (mimeType === 'application/pdf') return null;
  return "default-src 'none'";
}

/** Shared header work for both raw and thumbnail responses. */
function sendPrivateFile(res, absolutePath, { mimeType, downloadName, download }) {
  // eslint-disable-next-line no-control-regex
  const asciiName = (downloadName || 'file').replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '');
  const disposition = download ? 'attachment' : 'inline';
  const csp = cspFor(mimeType);

  res.set({
    'Content-Type': mimeType,
    'Content-Disposition': `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(downloadName || 'file')}`,
    // Private: this response is user-specific, so shared caches must not keep it.
    'Cache-Control': 'private, max-age=3600',
    // Stops a browser deciding a .txt is really HTML and rendering it as such.
    'X-Content-Type-Options': 'nosniff',
    ...(csp ? { 'Content-Security-Policy': csp } : {}),
  });

  // sendFile handles Range requests, which is what lets video seek properly.
  return res.sendFile(absolutePath, { dotfiles: 'deny' });
}

// @desc   Stream an uploaded file to its owner
// @route  GET /api/assets/:id/raw
// @access Private
const serveAssetRaw = asyncHandler(async (req, res) => {
  const asset = await ownedAsset(req.params.id, req.user._id);
  if (!asset) {
    res.status(404);
    throw new Error('File not found');
  }

  // basename strips any traversal that survived upload; the path is rebuilt
  // from the upload directory rather than taken from the database wholesale.
  const absolutePath = path.join(UPLOAD_DIR, path.basename(asset.fileName));

  return sendPrivateFile(res, absolutePath, {
    mimeType: asset.mimeType,
    downloadName: asset.originalName,
    download: req.query.download === '1',
  });
});

// @desc   Stream the generated preview image
// @route  GET /api/assets/:id/thumb
// @access Private
const serveAssetThumb = asyncHandler(async (req, res) => {
  const asset = await ownedAsset(req.params.id, req.user._id);
  const thumbFile = asset?.metadata?.thumbnailFile;

  if (!asset || !thumbFile) {
    res.status(404);
    throw new Error('Preview not found');
  }

  return sendPrivateFile(res, path.join(THUMB_DIR, path.basename(thumbFile)), {
    mimeType: 'image/webp',
    downloadName: 'preview.webp',
    download: false,
  });
});

// @desc   Delete an asset, its files on disk, and any nodes referencing it
// @route  DELETE /api/assets/:id
// @access Private
const deleteAsset = asyncHandler(async (req, res) => {
  const asset = await ownedAsset(req.params.id, req.user._id);
  if (!asset) {
    res.status(404);
    throw new Error('File not found');
  }

  const nodes = await Node.find({ asset: asset._id }).select('_id canvas');
  const nodeIds = nodes.map((n) => n._id);

  if (nodeIds.length) {
    await Edge.deleteMany({ $or: [{ source: { $in: nodeIds } }, { target: { $in: nodeIds } }] });
    await Node.deleteMany({ _id: { $in: nodeIds } });
  }

  await discard(path.join(UPLOAD_DIR, path.basename(asset.fileName)));
  if (asset.metadata?.thumbnailFile) {
    await discard(path.join(THUMB_DIR, path.basename(asset.metadata.thumbnailFile)));
  }
  await asset.deleteOne();

  res.json({ message: 'File deleted', id: req.params.id, nodes: nodeIds });
});

module.exports = {
  uploadAsset,
  createLinkNode,
  serveAssetRaw,
  serveAssetThumb,
  deleteAsset,
};
