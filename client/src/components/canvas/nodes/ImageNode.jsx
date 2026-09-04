'use client';

import { memo, useState } from 'react';
import { Expand, ImageOff } from 'lucide-react';

import { useCanvas } from '../CanvasContext';
import NodeShell from './NodeShell';
import useClickToOpen from './useClickToOpen';

/**
 * Image node (PRD 17.3). Renders the generated WebP thumbnail rather than the
 * original: a board with thirty 4 MB photos on it should not be thirty 4 MB
 * downloads. The full-resolution file is only fetched when the viewer opens.
 */
function ImageNode({ id, data, selected }) {
  const { openViewer } = useCanvas();
  const [failed, setFailed] = useState(false);

  const previewUrl = data.thumbUrl || data.fileUrl;
  const open = useClickToOpen(() =>
    openViewer({ kind: 'image', url: data.fileUrl, title: data.title, assetId: data.assetId })
  );

  return (
    <NodeShell
      id={id}
      data={data}
      selected={selected}
      minWidth={120}
      minHeight={90}
      className="bg-ink-50"
    >
      <div className="relative h-full w-full cursor-zoom-in" {...open} title={data.title}>
        {previewUrl && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={data.title || 'Uploaded image'}
            // Files come from the API origin with credentials; a plain <img>
            // sends cookies for same-site requests, which localhost:5001 is.
            className="h-full w-full object-cover"
            draggable={false}
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-300">
            <ImageOff size={20} strokeWidth={1.75} />
            <span className="px-3 text-center text-[11px] leading-tight">
              {failed ? 'Preview unavailable' : 'No preview'}
            </span>
          </div>
        )}

        <span className="pointer-events-none absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-ink-900/55 text-white opacity-0 backdrop-blur transition-opacity duration-150 group-hover:opacity-100">
          <Expand size={13} strokeWidth={2} />
        </span>

        {data.title ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink-900/75 to-transparent px-2.5 pb-1.5 pt-6 text-[11px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            {data.title}
          </span>
        ) : null}
      </div>
    </NodeShell>
  );
}

export default memo(ImageNode);
