'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, TriangleAlert } from 'lucide-react';

function SaveIndicator({ status }) {
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving…
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-melon-600">
        <TriangleAlert className="h-3 w-3" />
        Not saved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-400">
      <Check className="h-3 w-3" />
      Saved
    </span>
  );
}

/**
 * Top-left cluster from PRD 15: back, canvas name, save state.
 * The name is edited in place - click it and type.
 */
export default function CanvasTopBar({ name, onRename, status, children }) {
  const [draft, setDraft] = useState(name);
  const inputRef = useRef(null);

  // Keep in step if the name changes elsewhere (e.g. a reload).
  useEffect(() => setDraft(name), [name]);

  const commit = () => {
    const next = draft.trim();
    if (!next) {
      setDraft(name); // empty name isn't allowed - snap back
      return;
    }
    if (next !== name) onRename(next);
  };

  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-ink-100 bg-paper/85 px-4 backdrop-blur">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') inputRef.current?.blur();
          if (event.key === 'Escape') {
            setDraft(name);
            inputRef.current?.blur();
          }
        }}
        aria-label="Canvas name"
        maxLength={120}
        className="min-w-0 max-w-[280px] flex-shrink rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-ink-900 outline-none transition-colors hover:border-ink-200 focus:border-melon-400 focus:bg-white"
      />

      <SaveIndicator status={status} />

      <div className="ml-auto flex items-center gap-2">{children}</div>
    </header>
  );
}