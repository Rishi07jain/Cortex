'use client';

import { memo } from 'react';

import { useCanvas } from '../CanvasContext';
import NodeShell from './NodeShell';

/**
 * Video node (PRD 17.4). Plays in place with the browser's own controls.
 *
 * preload="metadata" fetches just enough to show the first frame and know the
 * duration; the rest streams on play. Seeking works because the API serves
 * files through res.sendFile, which answers Range requests - without that the
 * scrubber would be dead.
 */
function VideoNode({ id, data, selected }) {
  const { openViewer } = useCanvas();

  return (
    <NodeShell
      id={id}
      data={data}
      selected={selected}
      minWidth={200}
      minHeight={140}
      className="bg-ink-900"
    >
      <div className="relative h-full w-full">
        {/* nodrag: dragging the scrubber must not drag the node.
            nowheel: volume scrolling must not zoom the canvas. */}
        <video
          className="nodrag nowheel h-full w-full bg-ink-900 object-contain"
          src={data.fileUrl}
          poster={data.thumbUrl || undefined}
          controls
          preload="metadata"
          onDoubleClick={(event) => {
            event.stopPropagation();
            openViewer({
              kind: 'video',
              url: data.fileUrl,
              title: data.title,
              assetId: data.assetId,
            });
          }}
        />

        {data.title ? (
          <span className="pointer-events-none absolute inset-x-0 top-0 truncate bg-gradient-to-b from-ink-900/75 to-transparent px-2.5 pb-6 pt-1.5 text-[11px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            {data.title}
          </span>
        ) : null}
      </div>
    </NodeShell>
  );
}

export default memo(VideoNode);
