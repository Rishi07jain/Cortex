'use client';

import { useEffect, useRef, useState } from 'react';
import { Link2, StickyNote, Upload } from 'lucide-react';

// Mirrors the server's MIME allowlist. This only filters the OS file picker -
// the real gate is fileFilter in server/src/config/upload.js, because an
// accept attribute is a hint the user can override.
const ACCEPT = [
  'image/*',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/*',
  'application/pdf',
  '.txt,.md,.csv,.json,.zip',
  '.doc,.docx,.xls,.xlsx,.ppt,.pptx',
].join(',');

function ToolButton({ icon: Icon, label, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={[
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
        active ? 'bg-melon-50 text-melon-600' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
      ].join(' ')}
    >
      <Icon size={14} strokeWidth={2} />
      {label}
    </button>
  );
}

/**
 * Floating toolbar (PRD 16). Deliberately the slowest of the three ways to add
 * something - drag-and-drop and paste are quicker - but it is the only one
 * that is discoverable, so it stays.
 */
export default function CanvasToolbar({ onAddNote, onFilesPicked, onAddLink }) {
  const fileInputRef = useRef(null);
  const linkInputRef = useRef(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');

  useEffect(() => {
    if (linkOpen) linkInputRef.current?.focus();
  }, [linkOpen]);

  function submitLink(event) {
    event.preventDefault();
    const value = linkValue.trim();
    if (!value) return;
    onAddLink(value);
    setLinkValue('');
    setLinkOpen(false);
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
      {linkOpen ? (
        <form
          onSubmit={submitLink}
          className="mb-2 flex items-center gap-1.5 rounded-xl border border-ink-100 bg-surface p-1.5 shadow-float"
        >
          <input
            ref={linkInputRef}
            value={linkValue}
            onChange={(event) => setLinkValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                setLinkOpen(false);
              }
            }}
            placeholder="Paste a URL…"
            className="w-72 rounded-lg bg-ink-50 px-2.5 py-1.5 text-[12.5px] text-ink-900 outline-none placeholder:text-ink-300 focus:ring-2 focus:ring-melon-200"
          />
          <button
            type="submit"
            className="rounded-lg bg-melon-500 px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-melon-600"
          >
            Add
          </button>
        </form>
      ) : null}

      <div className="flex items-center gap-0.5 rounded-xl border border-ink-100 bg-surface/95 p-1 shadow-float backdrop-blur">
        <ToolButton icon={StickyNote} label="Note" onClick={onAddNote} />
        <ToolButton icon={Upload} label="Upload" onClick={() => fileInputRef.current?.click()} />
        <ToolButton icon={Link2} label="Link" active={linkOpen} onClick={() => setLinkOpen((v) => !v)} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          onFilesPicked(event.target.files);
          // Reset, or picking the same file twice in a row fires nothing.
          event.target.value = '';
        }}
      />
    </div>
  );
}
