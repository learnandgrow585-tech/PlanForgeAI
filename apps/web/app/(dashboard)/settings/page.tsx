'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: apiClient.me,
  });

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
          Account
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 w-48 animate-pulse rounded bg-surface" />
            <div className="h-4 w-32 animate-pulse rounded bg-surface" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted">Email</p>
              <p className="mt-0.5 font-medium">{user?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Name</p>
              <p className="mt-0.5 font-medium">
                {user?.name ?? (
                  <span className="italic text-muted">Not set — register with a name to add one</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Plan</p>
              <span className="mt-0.5 inline-block rounded-full bg-brand/10 px-2 py-0.5 font-mono text-xs text-brand">
                {user?.subscriptionTier ?? 'FREE'}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted">Role</p>
              <p className="mt-0.5 font-mono text-sm">{user?.role ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Member since</p>
              <p className="mt-0.5 text-sm text-fg">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
          AI Provider
        </h2>
        <p className="text-sm text-muted">
          Currently using <span className="font-mono text-brand">mock</span> provider — plans are
          generated instantly with realistic sample data.
        </p>
        <p className="mt-2 text-sm text-muted">
          To use real AI, get a free Gemini API key at{' '}
          <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer"
            className="text-brand hover:underline">
            aistudio.google.com
          </a>{' '}
          then set{' '}
          <code className="rounded bg-surface px-1 py-0.5 text-xs">AI_PROVIDER=gemini</code> and{' '}
          <code className="rounded bg-surface px-1 py-0.5 text-xs">GEMINI_API_KEY=…</code> in{' '}
          <code className="rounded bg-surface px-1 py-0.5 text-xs">.env</code>.
        </p>
      </section>

      <button
        onClick={logout}
        className="mt-8 rounded-lg border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-950/30 transition-colors"
      >
        Sign out
      </button>
    </main>
  );
}
