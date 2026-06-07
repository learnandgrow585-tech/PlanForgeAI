'use client';

import { useQuery } from '@tanstack/react-query';
import { adminClient } from '@/lib/api';

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}

export default function AdminOverview() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: adminClient.stats });

  if (isLoading) {
    return <div className="grid gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-card" />)}</div>;
  }

  const maxPlanner = Math.max(1, ...(data?.plansByPlanner.map((p) => p.count) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total users" value={data?.totals.users ?? 0} />
        <Stat label="Total plans" value={data?.totals.plans ?? 0} />
        <Stat label="Active planners" value={data?.totals.activePlanners ?? 0} />
        <Stat label="New users (7d)" value={data?.totals.newUsers7d ?? 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">Plans by Planner</h2>
          {data?.plansByPlanner.length ? (
            <div className="space-y-2">
              {data.plansByPlanner.map((p) => (
                <div key={p.planner}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{p.planner}</span>
                    <span className="font-mono text-muted">{p.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                    <div className="h-full bg-brand" style={{ width: `${(p.count / maxPlanner) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No plans generated yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">Plans by Status</h2>
          {data?.plansByStatus.length ? (
            <ul className="space-y-2">
              {data.plansByStatus.map((s) => (
                <li key={s.status} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="font-mono">{s.status}</span>
                  <span className="font-bold">{s.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No data.</p>
          )}
        </div>
      </div>
    </div>
  );
}
