'use client';

import { memo, useEffect, useRef } from 'react';
import { useCanvas } from '../CanvasContext';
import NodeShell from './NodeShell';

/**
 * Text / note node (PRD 17.1). Double-click to edit, Escape or click-away to
 * stop. New nodes open straight into edit mode so you can just start typing.
 */
function NoteNode({ id, data, selected }) {
  const { editingId, beginEditing, endEditing, updateNodeData } = useCanvas();
  const isEditing = editingId === id;
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isEditing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    // Caret at the end rather than selecting everything - safer for edits.
    el.setSelectionRange(el.value.length, el.value.length);
  }, [isEditing]);

  return (
    <NodeShell id={id} data={data} selected={selected} minWidth={140} minHeight={90}>
      {/* pb-6 keeps the last line of text clear of the done checkbox. */}
      <div className="flex h-full flex-col px-3 pb-6 pt-3" onDoubleClick={() => beginEditing(id)}>
        {data.title ? (
          <p
            className={[
              'mb-1 truncate text-[13px] font-semibold text-ink-900',
              // A ticked task reads as struck through, the way a to-do should.
              data.done ? 'line-through decoration-ink-300' : '',
            ].join(' ')}
          >
            {data.title}
          </p>
        ) : null}

        {isEditing ? (
          <textarea
            ref={textareaRef}
            // nodrag stops typing from dragging the node; nowheel lets the
            // textarea scroll instead of zooming the canvas.
            className="nodrag nowheel h-full w-full resize-none border-0 bg-transparent p-0 text-[13px] leading-relaxed text-ink-700 outline-none placeholder:text-ink-300"
            value={data.content ?? ''}
            placeholder="Type a note…"
            onChange={(event) => updateNodeData(id, { content: event.target.value })}
            onBlur={endEditing}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                endEditing();
              }
            }}
          />
        ) : (
          <p className="h-full overflow-hidden whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink-700">
            {data.content || <span className="text-ink-300">Double-click to write…</span>}
          </p>
        )}
      </div>
    </NodeShell>
  );
}

export default memo(NoteNode);
