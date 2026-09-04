'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';

import { formatDueLong, shiftDays, todayKey } from '@/lib/dates';
import { NODE_INTENTS } from '@/lib/nodeIntents';

// Manual colours, used when a node has no intent. Once an intent is set the
// intent's own colour takes over the stripe, so this row is hidden.
const SWATCHES = ['', '#e2445c', '#d9834a', '#d8a02c', '#3f9a56', '#4a95b8', '#5b7cc4', '#8a7cc2'];

function Section({ label, children }) {
  return (
    <div className="border-t border-ink-100 px-3 py-2.5 first:border-t-0">
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
        {label}
      </p>
      {children}
    </div>
  );
}

/**
 * Inspector for the selected node (PRD 19). Appears only when exactly one node
 * is selected - with a multi-selection there is no single answer to show, and
 * silently editing ten nodes at once from a panel that looks like it edits one
 * is worse than showing nothing.
 *
 * Every control writes straight through `onChange`, which is the editor's
 * debounced autosave. There is no Save button and no local draft to get out of
 * step with the node.
 */
export default function NodeInspector({ node, onChange, onClose }) {
  const data = node.data ?? {};
  const [title, setTitle] = useState(data.title ?? '');

  // Re-seed when the selection moves to a different node, or when the title is
  // edited on the card itself. Keyed on the id so typing here isn't clobbered
  // by the round trip of our own save.
  useEffect(() => {
    setTitle(node.data?.title ?? '');
  }, [node.id, node.data?.title]);

  const dueDate = data.dueDate || '';
  const intent = data.intent || 'none';

  const commitTitle = () => {
    const next = title.trim();
    if (next !== (data.title ?? '')) onChange({ title: next });
  };

  return (
    <aside className="absolute right-3 top-3 z-20 w-[248px] overflow-hidden rounded-xl border border-ink-100 bg-surface/95 shadow-float backdrop-blur">
      <div className="flex items-center gap-2 border-b border-ink-100 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink-800">
          {data.title?.trim() || 'Untitled node'}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="-mr-1 rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
        >
          <X size={13} strokeWidth={2} />
        </button>
      </div>

      <Section label="Title">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          placeholder="Name this node…"
          maxLength={200}
          className="w-full rounded-lg bg-ink-50 px-2 py-1.5 text-[12.5px] text-ink-900 outline-none placeholder:text-ink-300 focus:ring-2 focus:ring-melon-200"
        />
      </Section>

      <Section label="Purpose">
        <div className="grid grid-cols-2 gap-1">
          {NODE_INTENTS.map((option) => {
            const Icon = option.icon;
            const active = option.value === intent;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ intent: option.value })}
                title={option.hint}
                aria-pressed={active}
                className={[
                  'inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11.5px] font-medium',
                  'ring-1 ring-inset transition-colors',
                  active ? 'ring-transparent' : 'text-ink-600 ring-ink-100 hover:bg-ink-50',
                ].join(' ')}
                // The colour is data, not a fixed class, so it has to be inline
                // - Tailwind only ships classes it can see at build time.
                style={
                  active
                    ? { color: option.color, backgroundColor: `${option.color}1f` }
                    : undefined
                }
              >
                <Icon
                  size={12}
                  strokeWidth={2.25}
                  className="shrink-0"
                  style={{ color: option.color }}
                />
                <span className="truncate">{option.short}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section label="Due date (optional)">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={13} strokeWidth={2} className="shrink-0 text-ink-400" />
          <input
            type="date"
            value={dueDate}
            // The native picker already hands back "YYYY-MM-DD" in local time,
            // which is exactly the format stored - no conversion anywhere.
            onChange={(event) => onChange({ dueDate: event.target.value })}
            className="min-w-0 flex-1 rounded-lg bg-ink-50 px-2 py-1.5 text-[12px] text-ink-900 outline-none focus:ring-2 focus:ring-melon-200"
          />
        </div>

        <div className="mt-1.5 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => onChange({ dueDate: todayKey() })}
            className="rounded-md bg-ink-50 px-1.5 py-0.5 text-[11px] text-ink-600 transition-colors hover:bg-ink-100"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onChange({ dueDate: shiftDays(1) })}
            className="rounded-md bg-ink-50 px-1.5 py-0.5 text-[11px] text-ink-600 transition-colors hover:bg-ink-100"
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => onChange({ dueDate: shiftDays(7) })}
            className="rounded-md bg-ink-50 px-1.5 py-0.5 text-[11px] text-ink-600 transition-colors hover:bg-ink-100"
          >
            +1 week
          </button>
          {dueDate ? (
            <button
              type="button"
              onClick={() => onChange({ dueDate: '' })}
              className="rounded-md px-1.5 py-0.5 text-[11px] text-melon-600 transition-colors hover:bg-melon-50"
            >
              Clear
            </button>
          ) : null}
        </div>

        {dueDate ? (
          <p className="mt-1.5 text-[11px] text-ink-400">{formatDueLong(dueDate)}</p>
        ) : null}
      </Section>

      {intent === 'none' ? (
        <Section label="Colour">
          <div className="flex flex-wrap gap-1.5">
            {SWATCHES.map((colour) => {
              const active = (data.color || '') === colour;

              return (
                <button
                  key={colour || 'default'}
                  type="button"
                  onClick={() => onChange({ color: colour })}
                  aria-label={colour ? `Colour ${colour}` : 'No colour'}
                  aria-pressed={active}
                  className={[
                    'h-5 w-5 rounded-full ring-offset-1 transition-shadow',
                    active ? 'ring-2 ring-ink-400' : 'ring-1 ring-ink-100 hover:ring-ink-300',
                    colour ? '' : 'bg-surface',
                  ].join(' ')}
                  style={colour ? { backgroundColor: colour } : undefined}
                />
              );
            })}
          </div>
        </Section>
      ) : null}

      <Section label="Status">
        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-700">
          <input
            type="checkbox"
            checked={Boolean(data.done)}
            onChange={(event) => onChange({ done: event.target.checked })}
            className="h-3.5 w-3.5 accent-melon-500"
          />
          Done
        </label>
      </Section>
    </aside>
  );
}
