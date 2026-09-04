'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import MiniGraph from '@/components/marketing/MiniGraph';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* form side */}
      <div className="flex items-center justify-center px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          <Link href="/" className="mb-10 inline-flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-melon-500 text-[13px] font-semibold text-white">
              IC
            </span>
            <div className="text-xl font-bold text-ink-900 tracking-wider flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              Cortex
            </div>
          </Link>

          <h1 className="font-display text-[27px] font-semibold tracking-tighter">{title}</h1>
          {subtitle && <p className="mt-2 text-sm leading-relaxed text-ink-500">{subtitle}</p>}

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-6 text-sm text-ink-500">{footer}</div>}
        </motion.div>
      </div>

      {/* visual side */}
      <div className="relative hidden overflow-hidden border-l border-ink-100 bg-canvas lg:block">
        <div className="absolute inset-0 bg-dot-grid opacity-70" />
        <div className="relative flex h-full flex-col justify-center px-14">
          <MiniGraph className="h-[280px] w-full max-w-lg" />
          <blockquote className="mt-12 max-w-md">
            <p className="font-display text-xl font-medium leading-snug tracking-tight text-ink-900 text-balance">
              Put everything on the board. Connect the dots. See the bigger picture.
            </p>
            <p className="mt-3 text-[13px] text-ink-500">
              Files, images, videos, links and notes - placed spatially, connected meaningfully.
            </p>
          </blockquote>
        </div>
      </div>
    </main>
  );
}
