'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminClient } from '@/lib/api';

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { data: users, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: adminClient.users });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  const toggleActive = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) => adminClient.setUserActive(v.id, v.isActive),
    onSuccess: invalidate,
  });
  const setRole = useMutation({
    mutationFn: (v: { id: string; role: string }) => adminClient.setUserRole(v.id, v.role),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminClient.deleteUser(id),
    onSuccess: invalidate,
  });

  const filtered = (users ?? []).filter(
    (u) => u.email.toLowerCase().includes(search.toLowerCase()) || (u.name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by email or name…"
        className="w-full max-w-sm rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />

      {isLoading && <div className="h-40 animate-pulse rounded-xl bg-card" />}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Plans</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-medium">{u.name ?? '—'}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value })}
                    className="rounded border border-border bg-card px-2 py-1 text-xs"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </td>
                <td className="px-4 py-3 font-mono text-muted">{u.planCount}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 font-mono text-xs ${u.isActive ? 'bg-brand/10 text-brand' : 'bg-red-900/30 text-red-300'}`}>
                    {u.isActive ? 'ACTIVE' : 'SUSPENDED'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}
                      className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-fg"
                    >
                      {u.isActive ? 'Suspend' : 'Restore'}
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete ${u.email}? This removes their plans too.`)) remove.mutate(u.id); }}
                      className="rounded border border-border px-2 py-1 text-xs text-muted hover:border-red-500 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isLoading && filtered.length === 0 && <p className="text-sm text-muted">No users match.</p>}
    </div>
  );
}
