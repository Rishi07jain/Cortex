'use client';

import { Check, Crosshair, EyeOff, X } from 'lucide-react';

import { dueStatus, formatDueLabel } from '@/lib/dates';
import { intentFor } from '@/lib/nodeIntents';

function ProgressBar({ done, total, tone = 'melon' }) {
  // 0/0 shows a full bar rather than an empty one: an empty list is finished,
  // not unstarted, and a 0% bar on an empty day reads as failure.
  const percent = total === 0 ? 100 : Math.round((done / total) * 100);
  const fill = tone === 'melon' ? 'bg-melon-500' : 'bg-ink-300';

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${done} of ${total} done`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${fill}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/**
 * Today view (PRD 20). Lists everything due today or already overdue, with a
 * progress bar over that list and a second one over the whole board.
 *
 * Clicking a row flies the canvas to that node and selects it, which is the
 * point of the panel: it is a way *into* the graph, not a to-do list living
 * beside it. The dim toggle is the other half - it fades everything that isn't
 * on the list so the board itself becomes the today view.
 */
export default function TodayPanel({
  items,
  boardDone,
  boardTotal,
  dimOthers,
  onToggleDim,
  onFocus,
  onToggle,
  onClose,
}) {
  const doneCount = items.filter((item) => item.done).length;

  return (
    <aside className="absolute left-3 top-3 z-20 flex max-h-[calc(100%-1.5rem)] w-[262px] flex-col overflow-hidden rounded-xl border border-ink-100 bg-surface/95 shadow-float backdrop-blur">
      <div className="flex items-center gap-2 px-3 pb-2 pt-2.5">
        <span className="flex-1 text-[12px] font-semibold text-ink-800">Today</span>

        <button
          type="button"
          onClick={onToggleDim}
          aria-pressed={dimOthers}
          title={dimOthers ? 'Show the rest of the board' : 'Dim everything not due today'}
          className={[
            'rounded-md p-1 transition-colors',
            dimOthers
              ? 'bg-melon-50 text-melon-600'
              : 'text-ink-400 hover:bg-ink-50 hover:text-ink-700',
          ].join(' ')}
        >
          <EyeOff size={13} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close today view"
          className="-mr-1 rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
        >
          <X size={13} strokeWidth={2} />
        </button>
      </div>

      <div className="px-3 pb-2.5">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-[11px] text-ink-500">
            {items.length === 0 ? 'Nothing due' : `${doneCount} of ${items.length} done`}
          </span>
          <span className="text-[11px] font-medium tabular-nums text-ink-700">
            {items.length === 0 ? '—' : `${Math.round((doneCount / items.length) * 100)}%`}
          </span>
        </div>
        <ProgressBar done={doneCount} total={items.length} />
      </div>

      {items.length === 0 ? (
        <p className="border-t border-ink-100 px-3 py-4 text-center text-[11.5px] leading-relaxed text-ink-400">
          Nothing is due today.
          <br />
          Give a node a due date to see it here.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto border-t border-ink-100">
          {items.map((item) => {
            const intent = intentFor(item.intent);
            const IntentIcon = intent.icon;
            const overdue = dueStatus(item.dueDate) === 'overdue';

            return (
              <li key={item.id} className="border-b border-ink-50 last:border-b-0">
                <div className="group flex items-center gap-2 px-2.5 py-1.5 transition-colors hover:bg-ink-50">
                  <button
                    type="button"
                    onClick={() => onToggle(item.id, !item.done)}
                    aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
                    aria-pressed={item.done}
                    className={[
                      'grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border transition-colors',
                      item.done
                        ? 'border-melon-500 bg-melon-500 text-white'
                        : 'border-ink-200 text-transparent hover:border-melon-400',
                    ].join(' ')}
                  >
                    <Check size={10} strokeWidth={3} />
                  </button>

                  <IntentIcon
                    size={12}
                    strokeWidth={2}
                    className="shrink-0"
                    style={{ color: intent.color }}
                  />

                  <button
                    type="button"
                    onClick={() => onFocus(item.id)}
                    title="Show on the canvas"
                    className={[
                      'min-w-0 flex-1 truncate text-left text-[12px]',
                      item.done ? 'text-ink-400 line-through' : 'text-ink-800',
                    ].join(' ')}
                  >
                    {item.title?.trim() || 'Untitled'}
                  </button>

                  <span
                    className={[
                      'shrink-0 text-[10px] font-medium tabular-nums',
                      overdue ? 'text-melon-600' : 'text-ink-400',
                    ].join(' ')}
                  >
                    {formatDueLabel(item.dueDate)}
                  </span>

                  <Crosshair
                    size={11}
                    strokeWidth={2}
                    className="shrink-0 text-ink-300 opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="shrink-0 border-t border-ink-100 px-3 py-2">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-[10.5px] uppercase tracking-wide text-ink-400">Whole board</span>
          <span className="text-[11px] tabular-nums text-ink-500">
            {boardDone}/{boardTotal}
          </span>
        </div>
        <ProgressBar done={boardDone} total={boardTotal} tone="ink" />
      </div>
    </aside>
  );
}
