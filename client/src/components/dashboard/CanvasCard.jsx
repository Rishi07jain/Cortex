'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Trash2, GitBranch, Boxes } from 'lucide-react';
import { relativeTime } from '@/lib/utils';

export default function CanvasCard({ canvas, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="group relative"
    >
      <Link
        href={`/canvas/${canvas._id}`}
        className="block overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-card transition-colors hover:border-ink-200"
      >
        {/* preview strip - real thumbnails land in Step 4 */}
        <div className="relative h-28 bg-dot-grid">
          <div className="absolute left-4 top-5 h-5 w-16 rounded-md border border-ink-200 bg-white" />
          <div className="absolute left-24 top-12 h-5 w-20 rounded-md border border-melon-200 bg-melon-50" />
          <div className="absolute left-8 top-[74px] h-5 w-14 rounded-md border border-ink-200 bg-white" />
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            <line x1="80" y1="30" x2="96" y2="55" stroke="#b0b0aa" strokeWidth="1.2" strokeDasharray="3 3" />
            <line x1="96" y1="62" x2="60" y2="80" stroke="#b0b0aa" strokeWidth="1.2" strokeDasharray="3 3" />
          </svg>
        </div>

        <div className="px-4 py-3.5">
          <h3 className="truncate text-sm font-medium text-ink-900">{canvas.name}</h3>

          <div className="mt-2 flex items-center gap-3 text-[12px] text-ink-400">
            <span className="inline-flex items-center gap-1">
              <Boxes className="h-3.5 w-3.5" />
              {canvas.nodeCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitBranch className="h-3.5 w-3.5" />
              {canvas.edgeCount ?? 0}
            </span>
            <span className="ml-auto">{relativeTime(canvas.lastOpenedAt || canvas.updatedAt)}</span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => onDelete(canvas)}
        aria-label={`Delete ${canvas.name}`}
        className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-lg border border-ink-200 bg-white/90 text-ink-400 opacity-0 backdrop-blur transition-all hover:border-melon-300 hover:text-melon-600 focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
