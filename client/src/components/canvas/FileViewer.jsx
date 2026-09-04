'use client';

import { useEffect, useRef } from 'react';
import { Download, ExternalLink, X } from 'lucide-react';

/**
 * Full-screen overlay viewer for a single asset.
 *
 * PDFs render in an iframe pointed at the API, which means the browser's own
 * PDF viewer does the work - search, page thumbnails, printing and text
 * selection all come for free, and the app ships no PDF renderer. The pop-out
 * button hands the same URL to a real tab for anyone who wants it there
 * instead.
 */
export default function FileViewer({ item, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    // Capture phase: React Flow also listens for Escape (it clears selection),
    // and the viewer should win while it is open.
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    }

    window.addEventListener('keydown', onKeyDown, true);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  if (!item) return null;

  const { kind, url, title } = item;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink-900/85 backdrop-blur-sm animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'File preview'}
      // Clicking the backdrop closes; clicks inside the panel stop there.
      onClick={onClose}
    >
      <header className="flex shrink-0 items-center gap-2 px-4 py-3 text-white">
        <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{title || 'Preview'}</p>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            window.open(url, '_blank', 'noopener,noreferrer');
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-white/20"
          title="Open in a new browser tab"
        >
          <ExternalLink size={13} strokeWidth={2} />
          Open in tab
        </button>

        <a
          href={`${url}?download=1`}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-white/20"
          title="Download"
        >
          <Download size={13} strokeWidth={2} />
          Download
        </a>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
          title="Close (Esc)"
          aria-label="Close preview"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </header>

      <div
        className="min-h-0 flex-1 px-4 pb-4"
        onClick={(event) => event.stopPropagation()}
      >
        {kind === 'pdf' ? (
          <iframe
            // FitH opens at page width, which is what you want for a document
            // you are reading rather than skimming.
            src={`${url}#view=FitH`}
            title={title || 'PDF preview'}
            className="h-full w-full rounded-xl border-0 bg-surface"
          />
        ) : null}

        {kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={title || 'Image preview'}
            className="mx-auto h-full w-auto max-w-full rounded-xl object-contain"
          />
        ) : null}

        {kind === 'video' ? (
          <video
            src={url}
            className="mx-auto h-full w-auto max-w-full rounded-xl bg-black"
            controls
            autoPlay
          />
        ) : null}
      </div>

      <p className="pb-3 text-center text-[11px] text-white/45">
        Press Esc or click the backdrop to close
      </p>
    </div>
  );
}
