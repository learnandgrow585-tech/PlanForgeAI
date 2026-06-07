'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/planners', label: 'Planners' },
  { href: '/admin/blog', label: 'Blog' },
  { href: '/admin/audit', label: 'Audit Log' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading } = useQuery({ queryKey: ['me'], queryFn: apiClient.me });

  if (isLoading) {
    return <main className="mx-auto max-w-5xl px-6 py-10"><div className="h-8 w-40 animate-pulse rounded bg-card" /></main>;
  }

  // Client-side guard — backend also enforces SUPER_ADMIN
  if (user && user.role !== 'SUPER_ADMIN') {
    router.push('/dashboard');
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-red-400">403 — Admins only. Redirecting…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="text-xl">🛡</span>
        <h1 className="text-2xl font-bold">Super Admin</h1>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
                active ? 'border-b-2 border-brand text-brand' : 'text-muted hover:text-fg'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {children}
    </main>
  );
}
