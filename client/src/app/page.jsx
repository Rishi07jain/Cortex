import Link from 'next/link';
import MiniGraph from '@/components/marketing/MiniGraph';

/**
 * Placeholder landing page. The full animated Watermelon-style landing
 * (PRD sections 10 and 49) gets built in Step 5.
 */
export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-dot-grid opacity-60" />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-melon-500 text-[13px] font-semibold text-white">
            IC
          </span>
          <span className="text-sm font-medium tracking-tight text-ink-800">
            Cortex
          </span>
        </div>

        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-melon-500 px-4 py-2 text-sm font-medium text-white shadow-card hover:bg-melon-600"
          >
            Start mapping - free
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-ink-200 bg-white/70 px-3 py-1 text-xs font-medium text-ink-500">
            Visual research workspace
          </p>

          <h1 className="font-display text-[44px] font-semibold leading-[1.05] tracking-tighter text-balance lg:text-[56px]">
            Turn scattered information into a map of connections.
          </h1>

          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-500">
            Upload files, images, videos, links and notes. Place them on an infinite canvas and
            connect the dots to understand the bigger picture.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-xl bg-melon-500 px-6 py-3 text-[15px] font-medium text-white shadow-card transition-colors hover:bg-melon-600"
            >
              Start mapping - free
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-ink-200 bg-white px-6 py-3 text-[15px] font-medium text-ink-700 transition-colors hover:border-ink-300"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white/60 p-8 shadow-card backdrop-blur-sm">
          <MiniGraph className="h-[260px] w-full" />
        </div>
      </section>
    </main>
  );
}
