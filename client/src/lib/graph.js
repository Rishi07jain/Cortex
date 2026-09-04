/**
 * Translation layer between the API's documents and React Flow's node/edge
 * shape. Keeping it in one file means a schema change only breaks here.
 */

import { absoluteUrl } from './uploadApi';

// PRD section 18. Order matters - this is the order shown in the editor.
export const RELATIONSHIP_TYPES = [
  { value: 'related-to', label: 'Related to' },
  { value: 'works-at', label: 'Works at' },
  { value: 'founded', label: 'Founded' },
  { value: 'mentions', label: 'Mentions' },
  { value: 'supports', label: 'Supports' },
  { value: 'contradicts', label: 'Contradicts' },
  { value: 'caused', label: 'Caused' },
  { value: 'located-at', label: 'Located at' },
  { value: 'happened-before', label: 'Happened before' },
  { value: 'happened-after', label: 'Happened after' },
  { value: 'references', label: 'References' },
  { value: 'custom', label: 'Custom…' },
];

export const DIRECTIONS = [
  { value: 'forward', label: 'A → B' },
  { value: 'backward', label: 'A ← B' },
  { value: 'both', label: 'A ↔ B' },
  { value: 'none', label: 'No arrow' },
];

/** "contradicts" -> "Contradicts". Falls back to the raw value. */
export function relationshipLabelFor(type) {
  return RELATIONSHIP_TYPES.find((r) => r.value === type)?.label ?? type;
}

/** What the edge actually renders: a custom label wins, otherwise the type name. */
export function edgeDisplayLabel(edge) {
  if (edge.label) return edge.label;
  if (!edge.relationshipType || edge.relationshipType === 'custom') return '';
  return relationshipLabelFor(edge.relationshipType);
}

// Per-type starting size, so a note isn't the same shape as a video.
export const DEFAULT_NODE_SIZE = {
  note: { width: 240, height: 150 },
  text: { width: 240, height: 150 },
  person: { width: 220, height: 120 },
  event: { width: 230, height: 130 },
  image: { width: 280, height: 220 },
  file: { width: 260, height: 150 },
  video: { width: 320, height: 220 },
  link: { width: 280, height: 150 },
};

export function defaultSizeFor(type) {
  return DEFAULT_NODE_SIZE[type] ?? DEFAULT_NODE_SIZE.note;
}

const EDGE_COLOR = '#85857e';

/** API node document -> React Flow node. */
export function toFlowNode(doc) {
  const size = doc.size ?? defaultSizeFor(doc.type);
  const metadata = doc.metadata ?? {};

  return {
    id: String(doc._id),
    // React Flow picks the component from nodeTypes using this string, so the
    // API's type value doubles as the component key.
    type: doc.type || 'note',
    position: { x: doc.position?.x ?? 0, y: doc.position?.y ?? 0 },
    // v12 reads size from these top-level fields (NodeResizer writes them too).
    width: size.width,
    height: size.height,
    data: {
      type: doc.type || 'note',
      // What the node is *for*, independent of what it is. Drives the badge,
      // the accent colour and the goal coverage table.
      intent: doc.intent || 'none',
      title: doc.title ?? '',
      content: doc.content ?? '',
      color: doc.style?.color ?? '',
      tags: doc.tags ?? [],
      // Planning fields. dueDate stays a "YYYY-MM-DD" string all the way from
      // Mongo to the DOM - see lib/dates.js for why it is never a Date.
      done: Boolean(doc.done),
      dueDate: doc.dueDate || '',
      confidence: doc.confidence ?? 0,
      metadata,
      assetId: doc.asset ? String(doc.asset) : null,
      // The API stores paths ("/api/assets/<id>/raw") rather than absolute URLs,
      // so the same database works on localhost and on a deployed host. The
      // origin is stitched on here, once, instead of in every node component.
      kind: metadata.kind || '',
      fileUrl: absoluteUrl(metadata.url),
      thumbUrl: absoluteUrl(metadata.thumbnailUrl),
    },
  };
}

/** API edge document -> React Flow edge. */
export function toFlowEdge(doc) {
  const direction = doc.direction || 'forward';
  const color = doc.style?.color || EDGE_COLOR;
  const marker = { type: 'arrowclosed', color, width: 16, height: 16 };

  return {
    id: String(doc._id),
    source: String(doc.source),
    target: String(doc.target),
    // Nodes expose a handle per side; remembering which ones were used keeps
    // the line anchored where the user drew it after a reload.
    sourceHandle: doc.metadata?.sourceHandle ?? null,
    targetHandle: doc.metadata?.targetHandle ?? null,
    type: 'relationship',
    // Direction is presentational: swap which end gets the arrowhead.
    markerEnd: direction === 'forward' || direction === 'both' ? marker : undefined,
    markerStart: direction === 'backward' || direction === 'both' ? marker : undefined,
    style: {
      stroke: color,
      strokeWidth: doc.style?.thickness ?? 2,
      strokeDasharray: doc.style?.dashed || doc.isSuggestion ? '6 5' : undefined,
    },
    data: {
      label: doc.label ?? '',
      relationshipType: doc.relationshipType || 'related-to',
      direction,
      confidence: doc.confidence ?? 1,
      isSuggestion: !!doc.isSuggestion,
      color,
    },
  };
}