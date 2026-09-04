'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CanvasEditor from '@/components/canvas/CanvasEditor';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { canvasApi } from '@/lib/canvasApi';

export default function CanvasPage({ params }) {
  const { id } = use(params); // params is a promise in Next 15
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [graph, setGraph] = useState(null);
  const [error, setError] = useState('');

  // Route guard: no session -> login.
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;

    (async () => {
      try {
        // canvas + nodes + edges in one request
        const data = await canvasApi.graph(id);
        if (!cancelled) setGraph(data);
      } catch (err) {
        if (cancelled) return;
        // An expired session should bounce to login, not print a raw message.
        if (err.status === 401) router.replace('/login');
        else setError(err.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user, router]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-sm text-melon-600">{error}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm text-ink-500 hover:text-ink-800"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (authLoading || !user || !graph) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return <CanvasEditor canvas={graph.canvas} nodes={graph.nodes} edges={graph.edges} />;
}