'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const plans = useQuery({ queryKey: ['plans'], queryFn: apiClient.plans });
  const planners = useQuery({ queryKey: ['planners'], queryFn: apiClient.planners });
  const summary = useQuery({ queryKey: ['summary'], queryFn: apiClient.summary });

  const s = summary.data;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold">What to do next</h1>
      <p className="mt-1 text-sm text-muted">Your active plans, progress and upcoming milestones.</p>

      {/* ── Stat row ───────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Active plans" value={s?.counts.activePlans ?? '—'} />
        <StatCard
          label="Completion"
          value={`${s?.counts.completionRate ?? 0}%`}
          hint={`${s?.counts.completedMilestones ?? 0}/${s?.counts.totalMilestones ?? 0} milestones`}
        />
        <StatCard label="Streak" value={`${s?.streak ?? 0}🔥`} hint="days in a row" />
        <StatCard label="Total plans" value={s?.counts.totalPlans ?? '—'} />
      </div>

      {/* ── Two-column: next actions + upcoming ────────────────── */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* Next actions */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
            Your Next Action
          </h2>
          {s?.nextActions.length ? (
            <ul className="space-y-2">
              {s.nextActions.map((a) => (
                <li key={a.planId}>
                  <Link href={`/plans/${a.planId}`} className="group block rounded-lg border border-border p-3 hover:border-brand">
                    <p className="text-xs text-muted">{a.planTitle}</p>
                    <p className="mt-0.5 text-sm font-medium group-hover:text-brand">→ {a.nextMilestone}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No pending actions. Start a plan below.</p>
          )}
        </div>

        {/* Upcoming milestones */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
            Upcoming (next 7 days)
          </h2>
          {s?.upcoming.length ? (
            <ul className="space-y-2">
              {s.upcoming.map((u, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{u.title}</p>
                    <p className="text-xs text-muted">{u.planTitle}</p>
                  </div>
                  {u.targetDate && (
                    <span className="font-mono text-xs text-brand">
                      {new Date(u.targetDate).toLocaleDateString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing due in the next 7 days. 🎉</p>
          )}
        </div>
      </div>

      {/* ── Active plans ───────────────────────────────────────── */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Active Plans</h2>
          <Link href="/plans" className="text-xs text-brand hover:underline">View all →</Link>
        </div>

        {plans.isLoading && (
          <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-card" />)}</div>
        )}
        {plans.data?.length === 0 && (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted">No plans yet.</p>
            <Link href="/planners" className="mt-2 inline-block text-sm text-brand hover:underline">Start your first plan →</Link>
          </div>
        )}
        <ul className="space-y-2">
          {plans.data?.map((p) => (
            <li key={p.id}>
              <Link href={`/plans/${p.id}`} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-brand">
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-muted">{p.plannerName}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 font-mono text-xs ${p.status === 'ACTIVE' ? 'bg-brand/10 text-brand' : p.status === 'DRAFT' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-surface text-muted'}`}>
                  {p.status === 'DRAFT' ? 'GENERATING' : p.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Start a new plan ───────────────────────────────────── */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Start a New Plan</h2>
          <Link href="/planners" className="text-xs text-brand hover:underline">Browse all →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {planners.data?.slice(0, 3).map((pl) => (
            <Link key={pl.slug} href={`/planners/${pl.slug}`} className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-brand">
              <p className="font-semibold group-hover:text-brand">{pl.name}</p>
              <p className="mt-1 text-sm text-muted">{pl.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
