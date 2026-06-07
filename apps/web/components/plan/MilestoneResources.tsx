'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function MilestoneResources({ milestoneId }: { milestoneId: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['milestone-knowledge', milestoneId],
    queryFn: () => apiClient.milestoneKnowledge(milestoneId),
    enabled: open,
    staleTime: 1000 * 60 * 60,
  });

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted hover:text-brand"
      >
        {open ? '▾' : '▸'} 📚 Resources for this milestone
      </button>

      {open && (
        <div className="mt-2 space-y-3 border-l-2 border-border pl-3">
          {isLoading && <p className="text-xs text-muted">Finding resources…</p>}

          {data && (
            <>
              {data.videos.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Videos</p>
                  <ul className="space-y-1">
                    {data.videos.slice(0, 3).map((v) => (
                      <li key={v.id}>
                        <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-xs text-fg hover:text-brand">
                          ▶ {v.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.blogs.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Articles</p>
                  <ul className="space-y-1">
                    {data.blogs.slice(0, 3).map((b, i) => (
                      <li key={i}>
                        <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-xs text-fg hover:text-brand">
                          📄 {b.title} <span className="text-muted">· {b.sourceName}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.videos.length === 0 && data.blogs.length === 0 && (
                <p className="text-xs text-muted">No resources found.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
