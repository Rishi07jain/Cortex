'use client';

import { Handle, NodeResizer, Position } from '@xyflow/react';
import { Check } from 'lucide-react';

import { useCanvas } from '../CanvasContext';
import { dueStatus, formatDueLabel } from '@/lib/dates';
import { hasIntent, intentFor } from '@/lib/nodeIntents';

// One handle per side. With ConnectionMode.Loose a source handle also accepts
// incoming links, so every side works in both directions without doubling up.
const SIDES = [
  { id: 'top', position: Position.Top },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
  { id: 'left', position: Position.Left },
];

// Colour of the due pill by urgency. Overdue borrows the melon accent because
// it is the one state that should pull your eye across a busy board.
const DUE_TONE = {
  overdue: 'bg-melon-50 text-melon-700 ring-melon-200',
  today: 'bg-amber-50 text-amber-700 ring-amber-200',
  soon: 'bg-ink-50 text-ink-600 ring-ink-200',
  later: 'bg-ink-50 text-ink-400 ring-ink-100',
};

/** The small tick in the bottom-right corner of every node. */
function NodeCheckbox({ id, done }) {
  const { toggleDone } = useCanvas();

  return (
    <button
      type="button"
      // nodrag: without it, pressing the checkbox starts dragging the node and
      // the click never lands.
      className={[
        'nodrag absolute bottom-2 right-2 z-10 grid h-[18px] w-[18px] place-items-center rounded-[5px]',
        'border transition-colors',
        done
          ? 'border-melon-500 bg-melon-500 text-white'
          : 'border-ink-200 bg-surface/90 text-transparent backdrop-blur hover:border-melon-400 hover:bg-melon-50',
      ].join(' ')}
      aria-label={done ? 'Mark as not done' : 'Mark as done'}
      aria-pressed={done}
      title={done ? 'Done — click to undo' : 'Mark as done'}
      onClick={(event) => {
        // The canvas would otherwise treat this as a node selection click.
        event.stopPropagation();
        toggleDone(id, !done);
      }}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <Check size={12} strokeWidth={3} />
    </button>
  );
}

/**
 * Shared card chrome for every node type: border, selection state, the resize
 * frame, the intent badge, the due pill, the done checkbox and the four
 * connection handles.
 *
 * Node components render their own content as children and get all of the
 * above for free, so a new node type never has to reimplement any of it.
 */
export default function NodeShell({
  id,
  data = {},
  selected,
  accent,
  minWidth = 120,
  minHeight = 80,
  className = '',
  children,
}) {
  const intent = intentFor(data.intent);
  const showIntent = hasIntent(data.intent);
  const status = dueStatus(data.dueDate);
  const showHeader = showIntent || Boolean(status);
  const done = Boolean(data.done);
  const IntentIcon = intent.icon;

  // Intent colour wins over the manual colour picker: if you've said this is a
  // Goal, the board should read as a plan, not as whatever colour you picked
  // three weeks ago. The manual colour still shows on intent-less nodes.
  const stripe = showIntent ? intent.color : accent || data.color || '';

  return (
    <>
      {/* Only mounted while selected, so 200 nodes aren't each rendering eight
          invisible drag handles. */}
      <NodeResizer
        isVisible={selected}
        minWidth={minWidth}
        minHeight={minHeight}
        color="#e2445c"
        handleClassName="canvas-resize-handle"
        lineClassName="canvas-resize-line"
      />

      <div
        className={[
          'group relative flex h-full w-full flex-col overflow-hidden rounded-xl border bg-surface',
          'transition-[box-shadow,opacity] duration-150',
          selected
            ? 'border-melon-500 shadow-nodeSelected'
            : 'border-ink-100 shadow-card hover:shadow-float',
          // Ticked nodes recede rather than disappear - you still want to see
          // what you've covered, just not as loudly as what you haven't.
          done ? 'opacity-60' : '',
          // Set while the today filter is on and this node isn't part of today.
          data.dimmed ? 'pointer-events-none opacity-20 saturate-0' : '',
          className,
        ].join(' ')}
      >
        {stripe ? (
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 z-10 h-[3px]"
            style={{ backgroundColor: stripe }}
          />
        ) : null}

        {showHeader ? (
          <div className="flex shrink-0 items-center gap-1.5 px-2 pb-1 pt-2">
            {showIntent ? (
              <span
                className="inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                // Inline styles rather than Tailwind classes: the colour comes
                // from a data value, and Tailwind can only emit classes it can
                // see in the source at build time.
                style={{ color: intent.color, backgroundColor: `${intent.color}18` }}
                title={intent.hint}
              >
                <IntentIcon size={10} strokeWidth={2.5} className="shrink-0" />
                <span className="truncate">{intent.short}</span>
              </span>
            ) : null}

            {status ? (
              <span
                className={[
                  'ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                  DUE_TONE[status],
                ].join(' ')}
                title={`Due ${data.dueDate}`}
              >
                {formatDueLabel(data.dueDate)}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* min-h-0 is what lets the content shrink inside the flex column
            instead of pushing the header off the card. */}
        <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>

        <NodeCheckbox id={id} done={done} />

        {SIDES.map((side) => (
          <Handle
            key={side.id}
            id={side.id}
            type="source"
            position={side.position}
            className="canvas-handle"
          />
        ))}
      </div>
    </>
  );
}
