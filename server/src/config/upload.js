const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// server/uploads, resolved from src/config/ - two levels up.
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbnails');

// Created at require time so the very first upload can't race a missing folder.
fs.mkdirSync(THUMB_DIR, { recursive: true });

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * MIME allowlist, mapped to the node type each file becomes on the canvas.
 * An allowlist (rather than a blocklist) means a novel file type is refused by
 * default instead of landing on disk while we work out whether it's safe.
 */
const MIME_KINDS = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/avif': 'image',
  'image/svg+xml': 'image',

  'application/pdf': 'pdf',

  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',

  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/mp4': 'audio',

  'text/plain': 'file',
  'text/csv': 'file',
  'text/markdown': 'file',
  'application/json': 'file',
  'application/zip': 'file',
  'application/msword': 'file',
  'application/vnd.ms-excel': 'file',
  'application/vnd.ms-powerpoint': 'file',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'file',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'file',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'file',
};

/** Which node type a file becomes. Unknown types are refused upstream. */
function kindForMime(mimeType) {
  return MIME_KINDS[mimeType] ?? null;
}

/**
 * Random stored filename, original extension only.
 *
 * Never trust the uploaded name for the path: "../../server.js" or a 300-char
 * unicode name are both trivially weaponised. The real name is kept in the
 * database and used only for display and for the download filename.
 */
function storedName(originalName) {
  const ext = path.extname(originalName).slice(0, 12).toLowerCase().replace(/[^.a-z0-9]/g, '');
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, storedName(file.originalname)),
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: 1,
    // Multer buffers non-file fields in memory; keep that bounded too.
    fields: 10,
    fieldSize: 4096,
  },
  fileFilter: (req, file, cb) => {
    if (kindForMime(file.mimetype)) return cb(null, true);
    const err = new Error(`Unsupported file type: ${file.mimetype}`);
    err.statusCode = 415;
    return cb(err);
  },
});

module.exports = {
  upload,
  kindForMime,
  UPLOAD_DIR,
  THUMB_DIR,
  MAX_FILE_BYTES,
};
