// 5001, not 5000: macOS's AirPlay Receiver (AirTunes) owns port 5000, which
// shows up as a CORS/403 mystery. Keep in sync with server/.env PORT.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

/**
 * Thin fetch wrapper around the Express API.
 * credentials: 'include' is what carries the httpOnly auth cookie.
 */
async function request(path, { method = 'GET', body, headers, ...rest } = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      // Let the browser set the multipart boundary itself for uploads.
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    ...rest,
  });

  // Tolerate empty bodies (204) and non-JSON responses (proxy/gateway error pages).
  const text = await res.text();

  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!res.ok) {
        const error = new Error(`Request failed (${res.status} ${res.statusText})`);
        error.status = res.status;
        throw error;
      }
      throw new Error('Unexpected non-JSON response from the API');
    }
  }

  if (!res.ok) {
    const error = new Error(data?.message || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }

  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

export { API_URL };