'use client';

import { useCallback, useRef, useState } from 'react';

import { createLink, uploadFile } from '@/lib/uploadApi';
import { toFlowNode } from '@/lib/graph';

// Must match MAX_FILE_BYTES in server/src/config/upload.js. Checking here too
// means a 400 MB video is rejected instantly instead of after a long upload
// that the server was always going to refuse.
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

// How far each extra file in one drop is offset, so ten files fan out into a
// readable cascade instead of landing in an unreadable stack.
const CASCADE_PX = 28;

let uploadSeq = 0;

/**
 * Owns the upload queue: file uploads with progress, and link creation.
 *
 * Uploads run one at a time. Thumbnailing is CPU-bound and single-process on
 * the API, so firing ten at once would not finish sooner - it would just make
 * every progress bar crawl together and stall the event loop.
 */
export default function useCanvasUploads({ canvasId, onNodeCreated, onError }) {
  const [uploads, setUploads] = useState([]);
  const chainRef = useRef(Promise.resolve());

  const patchUpload = useCallback((id, patch) => {
    setUploads((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }, []);

  const dismissUpload = useCallback((id) => {
    setUploads((current) => current.filter((item) => item.id !== id));
  }, []);

  const uploadFiles = useCallback(
    (fileList, flowPosition) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;

      files.forEach((file, index) => {
        const id = `upload-${(uploadSeq += 1)}`;
        const position = {
          x: (flowPosition?.x ?? 0) + index * CASCADE_PX,
          y: (flowPosition?.y ?? 0) + index * CASCADE_PX,
        };

        if (file.size > MAX_FILE_BYTES) {
          setUploads((current) =>
            current.concat({
              id,
              name: file.name,
              progress: 0,
              status: 'error',
              error: 'Larger than the 25 MB limit',
            })
          );
          return;
        }

        setUploads((current) =>
          current.concat({ id, name: file.name, progress: 0, status: 'uploading', error: '' })
        );

        // Chain rather than await: uploadFiles stays synchronous for callers,
        // and a failure in one file must not skip the ones queued behind it.
        chainRef.current = chainRef.current.then(async () => {
          try {
            const { node } = await uploadFile({
              canvasId,
              file,
              position,
              onProgress: (fraction) => patchUpload(id, { progress: fraction }),
            });

            onNodeCreated?.(toFlowNode(node));
            dismissUpload(id);
          } catch (err) {
            if (err?.name === 'AbortError') {
              dismissUpload(id);
              return;
            }
            patchUpload(id, { status: 'error', error: err.message || 'Upload failed' });
          }
        });
      });
    },
    [canvasId, dismissUpload, onNodeCreated, patchUpload]
  );

  const addLink = useCallback(
    async (url, flowPosition) => {
      const id = `link-${(uploadSeq += 1)}`;
      setUploads((current) =>
        current.concat({
          id,
          name: url,
          progress: 0,
          status: 'fetching',
          error: '',
        })
      );

      try {
        const { node } = await createLink({ canvasId, url, position: flowPosition });
        onNodeCreated?.(toFlowNode(node));
        dismissUpload(id);
      } catch (err) {
        dismissUpload(id);
        onError?.(err.message || 'Could not add that link');
      }
    },
    [canvasId, dismissUpload, onError, onNodeCreated]
  );

  return { uploads, uploadFiles, addLink, dismissUpload };
}
