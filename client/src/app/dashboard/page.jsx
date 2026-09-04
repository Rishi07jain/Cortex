'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'motion/react';
import { Plus, FolderOpen } from 'lucide-react';
import TopBar from '@/components/dashboard/TopBar';
import WorkspaceSidebar from '@/components/dashboard/WorkspaceSidebar';
import CanvasCard from '@/components/dashboard/CanvasCard';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [canvases, setCanvases] = useState([]);

  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadingCanvases, setLoadingCanvases] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [creatingCanvas, setCreatingCanvas] = useState(false);
  const [error, setError] = useState('');

  // Guards against a slow response for workspace A landing after B was selected.
  const requestId = useRef(0);

  // Route guard: no session -> back to login.
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Load workspaces once we know who the user is.
  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const list = await api.get('/workspaces');
        if (cancelled) return;
        setError('');
        setWorkspaces(list);
        setActiveWorkspace((current) => current || list[0]?._id || null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoadingWorkspaces(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Load canvases for whichever workspace is selected.
  useEffect(() => {
    if (!user) return undefined;

    if (!activeWorkspace) {
      setCanvases([]);
      return undefined;
    }

    const id = ++requestId.current;
    setLoadingCanvases(true);

    (async () => {
      try {
        const list = await api.get(`/canvases?workspace=${activeWorkspace}`);
        if (id !== requestId.current) return; // a newer request won
        setError('');
        setCanvases(list);
      } catch (err) {
        if (id === requestId.current) setError(err.message);
      } finally {
        if (id === requestId.current) setLoadingCanvases(false);
      }
    })();

    return undefined;
  }, [activeWorkspace, user]);

  async function createWorkspace(name) {
    setError('');
    setCreatingWorkspace(true);

    try {
      const ws = await api.post('/workspaces', { name });
      setWorkspaces((prev) => [...prev, ws]);
      setActiveWorkspace(ws._id);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingWorkspace(false);
    }
  }

  async function renameWorkspace(workspace, name) {
    const previous = workspaces;
    setError('');
    // Optimistic: the row has already stopped being an input, so waiting on the
    // round trip would show the old name for a beat and look like a failure.
    setWorkspaces((prev) => prev.map((ws) => (ws._id === workspace._id ? { ...ws, name } : ws)));

    try {
      await api.put(`/workspaces/${workspace._id}`, { name });
    } catch (err) {
      setError(err.message);
      setWorkspaces(previous); // roll back
    }
  }

  async function createCanvas() {
    setError('');
    setCreatingCanvas(true);

    try {
      const canvas = await api.post('/canvases', {
        workspace: activeWorkspace,
        name: 'Untitled canvas',
      });
      router.push(`/canvas/${canvas._id}`);
    } catch (err) {
      setError(err.message);
      setCreatingCanvas(false);
    }
  }

  async function deleteCanvas(canvas) {
    if (!window.confirm(`Delete "${canvas.name}"? This removes its nodes and connections.`)) return;

    const previous = canvases;
    setError('');
    setCanvases((prev) => prev.filter((c) => c._id !== canvas._id)); // optimistic

    try {
      await api.del(`/canvases/${canvas._id}`);
      setWorkspaces((prev) =>
        prev.map((ws) =>
          ws._id === activeWorkspace
            ? { ...ws, canvasCount: Math.max(0, (ws.canvasCount || 1) - 1) }
            : ws
        )
      );
    } catch (err) {
      setError(err.message);
      setCanvases(previous); // roll back
    }
  }

  if (authLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const activeName = workspaces.find((w) => w._id === activeWorkspace)?.name;

  return (
    <div className="min-h-screen">
      <TopBar />

      <div className="flex flex-col md:flex-row">
        <WorkspaceSidebar
          workspaces={workspaces}
          activeId={activeWorkspace}
          onSelect={setActiveWorkspace}
          onCreate={createWorkspace}
          onRename={renameWorkspace}
          creating={creatingWorkspace}
        />

        <main className="min-w-0 flex-1 px-6 py-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tighter">
                {activeName || 'Your boards'}
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                {canvases.length} {canvases.length === 1 ? 'canvas' : 'canvases'} in this workspace
              </p>
            </div>

            <Button onClick={createCanvas} loading={creatingCanvas} disabled={!activeWorkspace}>
              <Plus className="h-4 w-4" />
              New canvas
            </Button>
          </div>

          {error && (
            <p
              role="alert"
              className="mb-5 rounded-xl bg-melon-50 px-3 py-2 text-[13px] text-melon-700"
            >
              {error}
            </p>
          )}

          {loadingWorkspaces || loadingCanvases ? (
            <div className="grid place-items-center py-24">
              <Spinner className="h-6 w-6" />
            </div>
          ) : canvases.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white/50 px-8 py-16 text-center">
              <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-ink-100 text-ink-400">
                <FolderOpen className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Your next investigation starts with a blank canvas
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
                Create a canvas, drop in your files and notes, then connect the pieces to see how
                they relate.
              </p>
              <Button
                className="mt-6"
                onClick={createCanvas}
                loading={creatingCanvas}
                disabled={!activeWorkspace}
              >
                <Plus className="h-4 w-4" />
                Create your first map
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* No mode="popLayout" - it needs a ref-forwarding child; `layout` alone is enough. */}
              <AnimatePresence>
                {canvases.map((canvas) => (
                  <CanvasCard key={canvas._id} canvas={canvas} onDelete={deleteCanvas} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
