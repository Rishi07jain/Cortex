'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export default function TopBar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const initials = (user?.name || '?')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  async function onLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-20 border-b border-ink-100 bg-paper/85 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">⚡</div>
          <span className="text-xl font-bold text-ink-800">
            Cortex
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span
              className="grid h-7 w-7 place-items-center rounded-full bg-ink-200 text-[11px] font-semibold text-ink-700"
              title={user?.email}
            >
              {initials}
            </span>
            <span className="text-[13px] text-ink-600">{user?.name}</span>
          </div>

          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
