'use client';

import { createContext, useContext } from 'react';

/**
 * Gives node and edge components access to the editor's actions without
 * stuffing callbacks into every node's `data` (which would re-serialise the
 * whole graph on each keystroke).
 */
const CanvasContext = createContext(null);

export function CanvasProvider({ value, children }) {
  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}

export function useCanvas() {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error('useCanvas must be used inside a CanvasProvider');
  return ctx;
}