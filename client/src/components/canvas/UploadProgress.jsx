'use client';

import { AlertCircle, Link2, Loader2, X } from 'lucide-react';

/** Floating list of in-flight uploads and any that failed. */
export default function UploadProgress({ uploads, onDismiss }) {
  if (!uploads.length) return null;

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex w-72 flex-col gap-2">
      {uploads.map((item) => {
        const failed = item.status === 'error';
        const percent = Math.round((item.progress ?? 0) * 100);

        return (
          <div
            key={item.id}
            className={[
              'pointer-events-auto flex items-center gap-2.5 rounded-xl border bg-surface/95 px-3 py-2.5 shadow-float backdrop-blur',
              failed ? 'border-melon-200' : 'border-ink-100',
            ].join(' ')}
          >
            <span className="shrink-0">
              {failed ? (
                <AlertCircle size={15} strokeWidth={2} className="text-melon-500" />
              ) : item.status === 'fetching' ? (
                <Link2 size={15} strokeWidth={2} className="text-node-link" />
              ) : (
                <Loader2 size={15} strokeWidth={2} className="animate-spin text-ink-300" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-ink-800">{item.name}</p>

              {failed ? (
                <p className="truncate text-[11px] text-melon-600">{item.error}</p>
              ) : item.status === 'fetching' ? (
                <p className="text-[11px] text-ink-400">Fetching preview…</p>
              ) : (
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-melon-500 transition-[width] duration-150"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              )}
            </div>

            {failed ? (
              <button
                type="button"
                onClick={() => onDismiss(item.id)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink-300 transition-colors hover:bg-ink-50 hover:text-ink-600"
                aria-label="Dismiss"
              >
                <X size={13} strokeWidth={2} />
              </button>
            ) : (
              <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-ink-300">
                {item.status === 'fetching' ? '' : `${percent}%`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
