'use client';

import { memo, useState } from 'react';
import {
  Download,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileType2,
} from 'lucide-react';

import { formatBytes } from '@/lib/uploadApi';
import { useCanvas } from '../CanvasContext';
import NodeShell from './NodeShell';
import useClickToOpen from './useClickToOpen';

/** Icon and accent colour for a file, chosen from its MIME type. */
function fileLook(mimeType = '') {
  if (mimeType === 'application/pdf') return { Icon: FileType2, tint: '#c92c46' };
  if (mimeType.startsWith('audio/')) return { Icon: FileAudio, tint: '#a06bc9' };
  if (mimeType.includes('zip')) return { Icon: FileArchive, tint: '#85857e' };
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
    return { Icon: FileSpreadsheet, tint: '#3fa08a' };
  }
  if (mimeType.startsWith('text/') || mimeType.includes('word') || mimeType.includes('document')) {
    return { Icon: FileText, tint: '#5b7cc4' };
  }
  return { Icon: FileIcon, tint: '#85857e' };
}

/**
 * PDF and generic-file node (PRD 17.2).
 *
 * A PDF renders as a small portrait rectangle showing its first page, and
 * opens in the viewer on click. Audio plays inline. Everything else is a
 * compact row that downloads when clicked.
 */
function FileNode({ id, data, selected }) {
  const { openViewer } = useCanvas();
  const [thumbFailed, setThumbFailed] = useState(false);

  const mimeType = data.metadata?.mimeType || '';
  const isPdf = data.kind === 'pdf' || mimeType === 'application/pdf';
  const isAudio = data.kind === 'audio' || mimeType.startsWith('audio/');
  const { Icon, tint } = fileLook(mimeType);
  const sizeLabel = formatBytes(data.metadata?.size);

  const open = useClickToOpen(() => {
    if (isAudio) return; // the <audio> element owns its own clicks
    if (isPdf) {
      openViewer({ kind: 'pdf', url: data.fileUrl, title: data.title, assetId: data.assetId });
      return;
    }
    // No sensible in-app view for a .docx or a .zip - hand it to the browser,
    // which will either render it or save it.
    window.open(`${data.fileUrl}?download=1`, '_blank', 'noopener,noreferrer');
  });

  // --- PDF: first-page thumbnail with a caption strip ---------------------
  if (isPdf) {
    const pageCount = Number(data.metadata?.pageCount) || 0;

    return (
      <NodeShell
        id={id}
        data={data}
        selected={selected}
        accent={tint}
        minWidth={130}
        minHeight={140}
      >
        <div className="flex h-full w-full cursor-pointer flex-col" {...open} title={data.title}>
          <div className="relative min-h-0 flex-1 overflow-hidden bg-ink-50">
            {data.thumbUrl && !thumbFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.thumbUrl}
                alt=""
                // object-top: the first thing you want to recognise on a page
                // is its heading, not the middle of a paragraph.
                className="h-full w-full object-cover object-top"
                draggable={false}
                onError={() => setThumbFailed(true)}
              />
            ) : (
              <div className="grid h-full w-full place-items-center">
                <Icon size={34} strokeWidth={1.4} style={{ color: tint }} />
              </div>
            )}

            <span className="pointer-events-none absolute inset-0 bg-ink-900/0 transition-colors duration-150 group-hover:bg-ink-900/5" />
          </div>

          <div className="flex shrink-0 items-center gap-1.5 border-t border-ink-100 bg-surface px-2 py-1.5">
            <Icon size={12} strokeWidth={2} style={{ color: tint }} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-ink-800">
              {data.title || 'Document.pdf'}
            </span>
            {pageCount ? (
              <span className="shrink-0 text-[10px] tabular-nums text-ink-300">{pageCount}p</span>
            ) : null}
          </div>
        </div>
      </NodeShell>
    );
  }

  // --- audio: a compact inline player -------------------------------------
  if (isAudio) {
    return (
      <NodeShell
        id={id}
        data={data}
        selected={selected}
        accent={tint}
        minWidth={200}
        minHeight={80}
      >
        <div className="flex h-full flex-col justify-center gap-1.5 px-2.5 py-2">
          <div className="flex items-center gap-1.5">
            <Icon size={13} strokeWidth={2} style={{ color: tint }} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-ink-800">
              {data.title || 'Audio'}
            </span>
          </div>
          {/* nodrag so scrubbing doesn't drag the node across the canvas. */}
          <audio className="nodrag h-8 w-full" src={data.fileUrl} controls preload="metadata" />
        </div>
      </NodeShell>
    );
  }

  // --- everything else: an icon row that downloads -------------------------
  return (
    <NodeShell id={id} data={data} selected={selected} accent={tint} minWidth={180} minHeight={70}>
      <div
        className="flex h-full cursor-pointer items-center gap-2.5 pl-3 pr-7"
        {...open}
        title={`${data.title} — click to download`}
      >
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
          style={{ backgroundColor: `${tint}1a`, color: tint }}
        >
          <Icon size={17} strokeWidth={1.75} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium text-ink-800">
            {data.title || 'File'}
          </span>
          {sizeLabel ? (
            <span className="block text-[11px] tabular-nums text-ink-400">{sizeLabel}</span>
          ) : null}
        </span>

        <Download
          size={13}
          strokeWidth={2}
          className="shrink-0 text-ink-300 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        />
      </div>
    </NodeShell>
  );
}

export default memo(FileNode);
