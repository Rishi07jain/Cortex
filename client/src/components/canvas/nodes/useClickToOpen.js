'use client';

import { useCallback, useRef } from 'react';

const DRAG_SLOP_PX = 4;

/**
 * Click-to-open that survives living inside a draggable node.
 *
 * React Flow nodes are draggable, and a drag still ends in a click event - so a
 * naive onClick fires the viewer every time you nudge a node. This records
 * where the pointer went down and ignores the click if it travelled more than a
 * few pixels, which is the difference between "clicked it" and "moved it".
 */
export default function useClickToOpen(onOpen) {
  const startRef = useRef(null);

  const onPointerDown = useCallback((event) => {
    startRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onClick = useCallback(
    (event) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRAG_SLOP_PX) return;

      event.stopPropagation();
      onOpen(event);
    },
    [onOpen]
  );

  return { onPointerDown, onClick };
}
