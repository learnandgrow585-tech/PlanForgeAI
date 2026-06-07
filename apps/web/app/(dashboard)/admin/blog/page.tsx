'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminClient } from '@/lib/api';

export default function AdminBlogList() {
  const qc = useQueryClient();
  const { data: posts, isLoading } = useQuery({ queryKey: ['admin-blog'], queryFn: adminClient.blogList });

  const remove = useMutation({
    mutationFn: (id: string) => adminClient.blogDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-blog'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Write and publish public blog posts (great for SEO). Changes are live instantly.</p>
        <Link href="/admin/blog/new" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-neutral-950 hover:opacity-90">
          + New post
        </Link>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-xl bg-card" />}
      {!isLoading && posts?.length === 0 && <p className="text-sm text-muted">No posts yet.</p>}

      <div className="space-y-2">
        {posts?.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{p.title}</p>
                <span className={`rounded-full px-2 py-0.5 font-mono text-xs ${p.status === 'PUBLISHED' ? 'bg-brand/10 text-brand' : 'bg-yellow-900/30 text-yellow-300'}`}>
                  {p.status}
                </span>
              </div>
              <p className="text-xs text-muted">/{p.slug} · {p.category}</p>
            </div>
            <div className="flex gap-2">
              {p.status === 'PUBLISHED' && (
                <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer"
                  className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-fg">View ↗</a>
              )}
              <Link href={`/admin/blog/${p.id}`} className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-brand">Edit</Link>
              <button
                onClick={() => { if (confirm(`Delete "${p.title}"?`)) remove.mutate(p.id); }}
                className="rounded border border-border px-2 py-1 text-xs text-muted hover:border-red-500 hover:text-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
