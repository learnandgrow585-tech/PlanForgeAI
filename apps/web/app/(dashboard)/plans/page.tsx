'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

export default function PlansListPage() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: apiClient.plans,
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Plans</h1>
          <p className="mt-1 text-sm text-muted">All your generated plans.</p>
        </div>
        <Link
          href="/planners"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-neutral-950 hover:opacity-90"
        >
          + New plan
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      )}

      {!isLoading && plans?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted">No plans yet.</p>
          <Link href="/planners" className="mt-2 inline-block text-sm text-brand hover:underline">
            Browse planners →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {plans?.map((p) => (
          <Link
            key={p.id}
            href={`/plans/${p.id}`}
            className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-border"
          >
            <div>
              <p className="font-medium group-hover:text-brand">{p.title}</p>
              <p className="text-xs text-muted">{p.plannerName}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-xs ${
                  p.status === 'ACTIVE'
                    ? 'bg-brand/10 text-brand'
                    : p.status === 'COMPLETED'
                    ? 'bg-blue-900/30 text-blue-300'
                    : p.status === 'DRAFT'
                    ? 'bg-yellow-900/30 text-yellow-300'
                    : 'bg-surface text-muted'
                }`}
              >
                {p.status === 'DRAFT' ? 'GENERATING' : p.status}
              </span>
              <p className="text-xs text-muted">
                {new Date(p.createdAt).toLocaleDateString()}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
