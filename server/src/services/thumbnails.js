const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const { THUMB_DIR } = require('../config/upload');

// Longest edge of a generated thumbnail. Big enough to stay sharp on a retina
// screen at node size, small enough that a board of 50 files loads instantly.
const THUMB_MAX_PX = 520;
// Render the PDF page larger than the thumbnail, then downscale - text stays
// legible instead of turning to mush.
const PDF_RENDER_SCALE = 2;
const MAX_EXTRACTED_CHARS = 20000;

/**
 * Optional native dependencies, loaded lazily.
 *
 * sharp and @napi-rs/canvas ship prebuilt binaries, but "prebuilt" is not
 * "guaranteed" - a mismatched Node version or an offline install can leave them
 * broken. Thumbnails are a nicety, not a requirement, so a failure here must
 * never take an upload down with it: the Asset is still created, thumbnailUrl
 * stays empty, and the canvas falls back to an icon card.
 */
function tryRequire(name) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(name);
  } catch {
    return null;
  }
}

let warnedMissing = false;

function warnOnce(what) {
  if (warnedMissing) return;
  warnedMissing = true;
  console.warn(`[thumbs] ${what} unavailable - files will use icon cards instead of previews.`);
  console.warn('[thumbs] To enable previews: npm i sharp pdfjs-dist@3.11.174 @napi-rs/canvas');
}

function thumbName() {
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`;
}

/** Writes a webp thumbnail and returns its filename, or null if sharp is absent. */
async function writeThumb(input) {
  const sharp = tryRequire('sharp');
  if (!sharp) {
    warnOnce('sharp');
    return null;
  }

  const fileName = thumbName();
  await sharp(input)
    .rotate() // honour EXIF orientation, so phone photos aren't sideways
    .resize(THUMB_MAX_PX, THUMB_MAX_PX, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(path.join(THUMB_DIR, fileName));

  return fileName;
}

/** Intrinsic dimensions, so an image node can open at the right aspect ratio. */
async function imageDimensions(filePath) {
  const sharp = tryRequire('sharp');
  if (!sharp) return {};

  try {
    const { width, height } = await sharp(filePath).metadata();
    return width && height ? { width, height } : {};
  } catch {
    return {};
  }
}

async function processImage(filePath, mimeType) {
  // SVG is vector - it scales for free, and rasterising it just loses quality.
  if (mimeType === 'image/svg+xml') return { thumbnailFile: null, metadata: {} };

  const [thumbnailFile, dimensions] = await Promise.all([
    writeThumb(filePath),
    imageDimensions(filePath),
  ]);

  return { thumbnailFile, metadata: dimensions };
}

/**
 * Renders page 1 of a PDF to a thumbnail and pulls out the page count and text.
 * The text is stored on the Asset now so full-text search in Step 4 doesn't
 * have to re-open every document in the workspace.
 */
async function processPdf(filePath) {
  const pdfjs = tryRequire('pdfjs-dist/legacy/build/pdf.js');
  const canvasLib = tryRequire('@napi-rs/canvas');

  if (!pdfjs || !canvasLib) {
    warnOnce('pdfjs-dist / @napi-rs/canvas');
    return { thumbnailFile: null, metadata: {}, extractedText: '' };
  }

  const data = new Uint8Array(await fs.readFile(filePath));
  const doc = await pdfjs.getDocument({
    data,
    // No worker thread in Node, and no network fetches for fonts or maps.
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  try {
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });

    const canvas = canvasLib.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext('2d');
    // PDFs assume paper: without this, transparent areas render black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: context, viewport }).promise;

    const thumbnailFile = await writeThumb(canvas.toBuffer('image/png'));
    const extractedText = await extractPdfText(doc);

    return {
      thumbnailFile,
      metadata: {
        pageCount: doc.numPages,
        width: Math.round(viewport.width / PDF_RENDER_SCALE),
        height: Math.round(viewport.height / PDF_RENDER_SCALE),
      },
      extractedText,
    };
  } finally {
    // Frees the worker and its buffers; skipping it leaks on every upload.
    await doc.destroy();
  }
}

async function extractPdfText(doc) {
  let text = '';

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    if (text.length >= MAX_EXTRACTED_CHARS) break;

    try {
      // eslint-disable-next-line no-await-in-loop
      const page = await doc.getPage(pageNum);
      // eslint-disable-next-line no-await-in-loop
      const content = await page.getTextContent();
      text += `${content.items.map((item) => item.str).join(' ')}\n`;
    } catch {
      // A single unreadable page shouldn't cost us the other 40.
      break;
    }
  }

  return text.slice(0, MAX_EXTRACTED_CHARS).trim();
}

/**
 * Entry point: given a freshly uploaded file, produce whatever preview data we
 * can. Always resolves - callers get empty values rather than an exception.
 */
async function processUpload({ filePath, mimeType, kind }) {
  const empty = { thumbnailFile: null, metadata: {}, extractedText: '' };

  try {
    if (kind === 'image') return { ...empty, ...(await processImage(filePath, mimeType)) };
    if (kind === 'pdf') return { ...empty, ...(await processPdf(filePath)) };
    return empty;
  } catch (err) {
    console.warn(`[thumbs] preview generation failed for ${path.basename(filePath)}: ${err.message}`);
    return empty;
  }
}

module.exports = { processUpload, THUMB_MAX_PX };
