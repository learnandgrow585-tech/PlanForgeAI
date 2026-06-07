'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get('q') ?? '';
  const [term, setTerm] = useState(q);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', q],
    queryFn: () => apiClient.search(q),
    enabled: q.trim().length >= 2,
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold">Search</h1>
      <form
        onSubmit={(e) => { e.preventDefault(); router.push(`/search?q=${encodeURIComponent(term)}`); }}
        className="mt-4"
      >
        <input
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search planners and your plans…"
          className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
        />
      </form>

      {q.trim().length < 2 && <p className="mt-6 text-sm text-muted">Type at least 2 characters.</p>}
      {(isLoading || isFetching) && q.trim().length >= 2 && <p className="mt-6 text-sm text-muted">Searching…</p>}

      {data && (
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
              Planners ({data.planners.length})
            </h2>
            {data.planners.length === 0 ? (
              <p className="text-sm text-muted">No matching planners.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {data.planners.map((p) => (
                  <Link key={p.slug} href={`/planners/${p.slug}`}
                    className="group rounded-lg border border-border bg-card p-3 hover:border-brand">
                    <p className="text-sm font-medium group-hover:text-brand">{p.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{p.description}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
              Your Plans ({data.plans.length})
            </h2>
            {data.plans.length === 0 ? (
              <p className="text-sm text-muted">No matching plans.</p>
            ) : (
              <ul className="space-y-2">
                {data.plans.map((p) => (
                  <li key={p.id}>
                    <Link href={`/plans/${p.id}`}
                      className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:border-brand">
                      <div>
                        <p className="text-sm font-medium">{p.title}</p>
                        <p className="text-xs text-muted">{p.plannerName}</p>
                      </div>
                      <span className="font-mono text-xs text-muted">{p.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="px-6 py-10 text-sm text-muted">Loading…</main>}>
      <SearchInner />
    </Suspense>
  );
}
