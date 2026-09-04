'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Layers, Pencil } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils';

/**
 * One row in the workspace list.
 *
 * The row can't be a single <button> any more: it holds a rename button, and a
 * button inside a button is invalid HTML that browsers silently unnest. So the
 * row is a div carrying the visuals, with the select and rename actions as
 * sibling buttons inside it.
 */
function WorkspaceRow({ workspace, isActive, onSelect, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(workspace.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) return;
    setDraft(workspace.name);
    // Select the whole name: renaming usually means replacing, not appending.
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing, workspace.name]);

  function commit() {
    setEditing(false);
    const next = draft.trim();
    // An empty name would fail the model's `required` anyway - snap back
    // rather than round-trip to the server for a 400.
    if (!next || next === workspace.name) return;
    onRename(workspace, next);
  }

  if (editing) {
    return (
      <div className="rounded-lg bg-white px-2.5 py-1.5 shadow-card">
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
            if (event.key === 'Escape') setEditing(false);
          }}
          aria-label="Workspace name"
          maxLength={120}
          className="w-full bg-transparent text-sm font-medium text-ink-900 outline-none"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
        isActive ? 'bg-white text-ink-900 shadow-card' : 'text-ink-600 hover:bg-ink-100'
      )}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: workspace.color || '#e2445c' }}
      />

      <button
        type="button"
        onClick={() => onSelect(workspace._id)}
        onDoubleClick={() => setEditing(true)}
        className="min-w-0 flex-1 truncate text-left font-medium"
      >
        {workspace.name}
      </button>

      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Rename ${workspace.name}`}
        title="Rename"
        className="shrink-0 rounded p-0.5 text-ink-300 opacity-0 transition-opacity hover:text-ink-700 focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Pencil className="h-3 w-3" />
      </button>

      <span className="shrink-0 text-[11px] tabular-nums text-ink-400">
        {workspace.canvasCount ?? 0}
      </span>
    </div>
  );
}

export default function WorkspaceSidebar({
  workspaces,
  activeId,
  onSelect,
  onCreate,
  onRename,
  creating,
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreate(name.trim());
    setName('');
    setShowForm(false);
  }

  return (
    <aside className="w-full shrink-0 border-b border-ink-100 px-5 py-6 md:w-64 md:border-b-0 md:border-r">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
          Workspaces
        </h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          aria-label="New workspace"
          className="grid h-6 w-6 place-items-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-3 overflow-hidden"
          >
            <div className="space-y-2 pt-1">
              <Input
                id="workspace-name"
                placeholder="Workspace name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={creating}>
                  Create
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <nav className="space-y-0.5">
        {workspaces.map((ws) => (
          <WorkspaceRow
            key={ws._id}
            workspace={ws}
            isActive={ws._id === activeId}
            onSelect={onSelect}
            onRename={onRename}
          />
        ))}

        {workspaces.length === 0 && (
          <p className="flex items-center gap-2 px-2.5 py-2 text-[13px] text-ink-400">
            <Layers className="h-3.5 w-3.5" />
            No workspaces yet
          </p>
        )}
      </nav>
    </aside>
  );
}
