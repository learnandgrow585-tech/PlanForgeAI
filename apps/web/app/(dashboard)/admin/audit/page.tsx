'use client';

import { useQuery } from '@tanstack/react-query';
import { adminClient } from '@/lib/api';

const ACTION_COLORS: Record<string, string> = {
  USER_SUSPEND: 'text-red-300',
  USER_DELETE: 'text-red-300',
  USER_RESTORE: 'text-brand',
  USER_ROLE_CHANGE: 'text-blue-300',
  PLANNER_CREATE: 'text-brand',
  PLANNER_UPDATE: 'text-blue-300',
  PLANNER_DELETE: 'text-red-300',
  PLANNER_DISABLE: 'text-yellow-300',
};

export default function AdminAudit() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-audit'], queryFn: adminClient.audit });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Append-only log of all admin actions (most recent 100).</p>
      {isLoading && <div className="h-40 animate-pulse rounded-xl bg-card" />}
      {!isLoading && data?.length === 0 && <p className="text-sm text-muted">No admin actions yet.</p>}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-4 py-3 text-xs text-muted">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs">{e.actor?.email ?? '—'}</td>
                <td className={`px-4 py-3 font-mono text-xs ${ACTION_COLORS[e.action] ?? ''}`}>{e.action}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{e.target ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
