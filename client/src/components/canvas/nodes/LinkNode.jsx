'use client';

import { memo, useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';

import NodeShell from './NodeShell';
import useClickToOpen from './useClickToOpen';

/**
 * Link node (PRD 17.5) - a rich preview card built from the page's Open Graph
 * tags, which the server fetched behind its SSRF guard.
 *
 * The preview image and favicon are loaded straight from the source host, so a
 * third party learns your IP when a card renders. That is how every link
 * unfurl works, but if the boards ever hold sensitive research the fix is to
 * cache both through the API the same way uploads are served.
 */
function LinkNode({ id, data, selected }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);

  const meta = data.metadata ?? {};
  const url = meta.url || data.fileUrl;
  const domain = meta.domain || '';

  const open = useClickToOpen(() => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  });

  const showImage = Boolean(meta.image) && !imageFailed;

  return (
    <NodeShell
      id={id}
      data={data}
      selected={selected}
      accent="#4a95b8"
      minWidth={200}
      minHeight={110}
    >
      <div className="flex h-full w-full cursor-pointer flex-col" {...open} title={url}>
        {showImage ? (
          <div className="relative min-h-0 flex-1 overflow-hidden bg-ink-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meta.image}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
            />
          </div>
        ) : null}

        <div className={`flex shrink-0 flex-col gap-1 px-3 py-2.5 ${showImage ? 'border-t border-ink-100' : 'h-full justify-center'}`}>
          <div className="flex items-center gap-1.5">
            {meta.favicon && !iconFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={meta.favicon}
                alt=""
                className="h-3.5 w-3.5 shrink-0 rounded-sm"
                draggable={false}
                referrerPolicy="no-referrer"
                onError={() => setIconFailed(true)}
              />
            ) : (
              <Globe size={13} strokeWidth={2} className="shrink-0 text-node-link" />
            )}

            <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium uppercase tracking-wide text-ink-400">
              {meta.siteName || domain || 'Link'}
            </span>

            <ExternalLink
              size={12}
              strokeWidth={2}
              className="shrink-0 text-ink-300 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            />
          </div>

          <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-ink-900">
            {data.title || domain || url}
          </p>

          {data.content ? (
            <p className="line-clamp-2 text-[11.5px] leading-snug text-ink-400">{data.content}</p>
          ) : null}
        </div>
      </div>
    </NodeShell>
  );
}

export default memo(LinkNode);
