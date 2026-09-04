import { API_URL, api } from './api';

/** Turns an API-relative path ("/api/assets/123/raw") into a loadable URL. */
export function absoluteUrl(pathname) {
  if (!pathname) return '';
  if (/^https?:\/\//i.test(pathname)) return pathname;
  return `${API_URL}${pathname}`;
}

/**
 * Uploads one file with progress reporting.
 *
 * This is the one place the app uses XHR instead of fetch: fetch still has no
 * upload progress event, and a 20 MB video with no feedback looks like a hang.
 * withCredentials is the XHR spelling of credentials: 'include' - without it
 * the auth cookie never leaves the browser and the API answers 401.
 */
export function uploadFile({ canvasId, file, position, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('x', String(Math.round(position?.x ?? 0)));
    form.append('y', String(Math.round(position?.y ?? 0)));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/api/canvases/${canvasId}/assets`);
    xhr.withCredentials = true;

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
    });

    xhr.addEventListener('load', () => {
      let payload = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload) {
        resolve(payload);
        return;
      }

      const error = new Error(payload?.message || `Upload failed (${xhr.status})`);
      error.status = xhr.status;
      reject(error);
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed - is the API running?')));
    xhr.addEventListener('abort', () => reject(new DOMException('Upload cancelled', 'AbortError')));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(form);
  });
}

/** Creates a link node. The server does the fetching, behind its SSRF guard. */
export function createLink({ canvasId, url, position }) {
  return api.post(`/canvases/${canvasId}/links`, {
    url,
    x: Math.round(position?.x ?? 0),
    y: Math.round(position?.y ?? 0),
  });
}

/** Deletes an asset and every node that referenced it. */
export function deleteAsset(assetId) {
  return api.del(`/assets/${assetId}`);
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

/** Does this pasted or typed string look like something we should link? */
export function looksLikeUrl(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  // Bare "example.com/path" - a dot, no spaces, and a plausible TLD.
  return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(trimmed) && !IMAGE_EXT.test(trimmed);
}

/** "4.2 MB" - for file node subtitles. */
export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!value || value < 0) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(value < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}
