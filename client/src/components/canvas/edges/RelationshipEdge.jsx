'use client';

import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import { edgeDisplayLabel } from '@/lib/graph';
import { useCanvas } from '../CanvasContext';

const SELECTED_COLOR = '#e2445c';

/**
 * A connection with its relationship label sitting on the line (PRD 18).
 * Clicking the label reopens the relationship editor.
 */
function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  markerStart,
  style,
  data,
  selected,
}) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { editEdge } = useCanvas();
  const label = edgeDisplayLabel({
    label: data?.label,
    relationshipType: data?.relationshipType,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          ...style,
          stroke: selected ? SELECTED_COLOR : style?.stroke,
          strokeWidth: selected ? (style?.strokeWidth ?? 2) + 1 : style?.strokeWidth,
        }}
      />

      <EdgeLabelRenderer>
        <button
          type="button"
          // nodrag/nopan stop the label from panning the canvas when clicked.
          className={[
            'nodrag nopan pointer-events-auto absolute rounded-full border px-2 py-0.5 text-[11px] font-medium',
            'transition-colors',
            selected
              ? 'border-melon-500 bg-melon-50 text-melon-700'
              : 'border-ink-100 bg-surface/95 text-ink-600 hover:border-ink-200 hover:text-ink-900',
            label ? '' : 'opacity-0 group-hover/canvas:opacity-100',
          ].join(' ')}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          onClick={(event) => {
            event.stopPropagation();
            editEdge(id);
          }}
        >
          {label || 'Add label'}
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdge);