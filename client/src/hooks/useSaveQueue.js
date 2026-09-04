'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Debounced write queue for canvas autosave.
 *
 * Saves are keyed, and a newer save for the same key replaces the one waiting -
 * so dragging a node fires one request when you let go, not one per frame.
 * `status` drives the "Saved / Saving…" indicator in the top bar.
 */
export default function useSaveQueue({ delay = 600 } = {}) {
  const timersRef = useRef(new Map()); // key -> timeout id
  const pendingRef = useRef(new Map()); // key -> latest save fn
  const inFlightRef = useRef(0);
  const errorRef = useRef(false);

  const [status, setStatus] = useState('saved'); // 'saved' | 'saving' | 'error'

  // Recompute the badge from what is actually outstanding.
  const settle = useCallback(() => {
    if (errorRef.current) setStatus('error');
    else if (inFlightRef.current > 0 || timersRef.current.size > 0) setStatus('saving');
    else setStatus('saved');
  }, []);

  const execute = useCallback(
    async (fn) => {
      inFlightRef.current += 1;
      setStatus('saving');
      try {
        await fn();
        errorRef.current = false;
      } catch (err) {
        errorRef.current = true;
        // Surfaced as "Not saved" in the UI; the console has the detail.
        console.error('[canvas] autosave failed:', err);
      } finally {
        inFlightRef.current -= 1;
        settle();
      }
    },
    [settle]
  );

  /** Queue a save, replacing any earlier one still waiting under the same key. */
  const schedule = useCallback(
    (key, fn) => {
      pendingRef.current.set(key, fn);
      setStatus('saving');

      const existing = timersRef.current.get(key);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        timersRef.current.delete(key);
        const latest = pendingRef.current.get(key);
        pendingRef.current.delete(key);
        if (latest) execute(latest);
      }, delay);

      timersRef.current.set(key, timer);
    },
    [delay, execute]
  );

  /** Save immediately - for creates and deletes, which shouldn't wait. */
  const runNow = useCallback((fn) => execute(fn), [execute]);

  /** Send everything that's waiting right now. */
  const flush = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();

    const fns = Array.from(pendingRef.current.values());
    pendingRef.current.clear();
    fns.forEach((fn) => execute(fn));
  }, [execute]);

  // Leaving the page with writes still queued would silently lose them.
  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (timersRef.current.size === 0 && inFlightRef.current === 0) return undefined;
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Navigating away inside the app (Back to dashboard) - fire what's pending.
  useEffect(() => {
    const timers = timersRef.current;
    const pending = pendingRef.current;

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      pending.forEach((fn) => {
        try {
          fn();
        } catch {
          /* the view is going away; nothing useful left to do */
        }
      });
      pending.clear();
    };
  }, []);

  return { status, schedule, runNow, flush };
}