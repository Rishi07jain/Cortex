import { api } from './api';

/**
 * Canvas-scoped API calls. Nodes and edges live under a canvas on the server,
 * so ownership is checked once per request by the loadCanvas middleware.
 */
export const canvasApi = {
  // Canvas + nodes + edges in one round trip.
  graph: (canvasId) => api.get(`/canvases/${canvasId}/graph`),
  updateCanvas: (canvasId, body) => api.put(`/canvases/${canvasId}`, body),

  createNode: (canvasId, body) => api.post(`/canvases/${canvasId}/nodes`, body),
  updateNode: (canvasId, nodeId, body) => api.put(`/canvases/${canvasId}/nodes/${nodeId}`, body),
  // One request for a whole batch of drags/resizes.
  bulkUpdateNodes: (canvasId, updates) => api.patch(`/canvases/${canvasId}/nodes`, { updates }),
  deleteNode: (canvasId, nodeId) => api.del(`/canvases/${canvasId}/nodes/${nodeId}`),

  createEdge: (canvasId, body) => api.post(`/canvases/${canvasId}/edges`, body),
  updateEdge: (canvasId, edgeId, body) => api.put(`/canvases/${canvasId}/edges/${edgeId}`, body),
  deleteEdge: (canvasId, edgeId) => api.del(`/canvases/${canvasId}/edges/${edgeId}`),
};