'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/planners', label: 'Marketplace', icon: '✦' },
  { href: '/plans', label: 'My Plans', icon: '◎' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }
    setMounted(true);
  }, [router]);

  // Close the mobile drawer whenever the route changes
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: apiClient.me,
    enabled: mounted,
  });

  const nav = [
    ...NAV,
    ...(user?.role === 'SUPER_ADMIN' ? [{ href: '/admin', label: 'Admin', icon: '🛡' }] : []),
  ];

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  }

  const Sidebar = (
    <div className="flex h-full flex-col bg-bg">
      {/* Logo */}
      <div className="border-b border-border px-5 py-4">
        <span className="font-mono text-sm font-semibold text-brand">$ planforge-ai</span>
        <p className="mt-0.5 text-xs text-muted">Planning OS</p>
      </div>

      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = (new FormData(e.currentTarget).get('q') as string)?.trim();
          if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
        }}
        className="px-3 pt-3"
      >
        <input
          name="q"
          placeholder="🔍 Search…"
          className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs focus:border-brand focus:outline-none"
        />
      </form>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {nav.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-surface hover:text-fg'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="px-4 pb-3">
        <ThemeToggle />
      </div>

      {/* User footer */}
      {user && (
        <div className="border-t border-border px-4 py-3">
          <p className="truncate text-xs font-medium text-fg">{user.name ?? user.email}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
          <button onClick={logout} className="mt-2 text-xs text-muted hover:text-red-400">
            Sign out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* ── Mobile top bar ───────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border bg-bg px-4 py-3 md:hidden">
        <span className="font-mono text-sm font-semibold text-brand">$ planforge-ai</span>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-md border border-border px-3 py-1.5 text-fg"
        >
          ☰
        </button>
      </div>

      {/* ── Desktop sidebar (fixed) ──────────────────── */}
      <aside className="fixed left-0 top-0 hidden h-full w-56 border-r border-border md:block">
        {Sidebar}
      </aside>

      {/* ── Mobile drawer ────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-border shadow-xl">
            {Sidebar}
          </aside>
        </div>
      )}

      {/* ── Main content ─────────────────────────────── */}
      <div className="md:ml-56">{children}</div>
    </div>
  );
}
