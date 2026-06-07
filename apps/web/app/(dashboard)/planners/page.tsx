'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  WEALTH: 'Wealth',
  GOAL: 'Goals',
  CAREER: 'Career',
  FITNESS: 'Fitness',
  STARTUP: 'Startup',
  RETIREMENT: 'Retirement',
  EDUCATION: 'Education',
  VEHICLE: 'Vehicle',
  HOUSE_CONSTRUCTION: 'Construction',
  ENGINEERING: 'Engineering',
  TRAVEL: 'Travel',
  RELATIONSHIP: 'Relationship',
  PRODUCTIVITY: 'Productivity',
  OTHER: 'Other',
};

// Map the seed's Lucide icon names to emojis (no extra dependency)
const ICONS: Record<string, string> = {
  TrendingUp: '📈',
  Target: '🎯',
  Briefcase: '💼',
  Dumbbell: '🏋️',
  Rocket: '🚀',
  Palmtree: '🌴',
  GraduationCap: '🎓',
  Car: '🚗',
  Home: '🏠',
  Sparkles: '✨',
};

export default function PlannersPage() {
  const { data, isLoading } = useQuery({ queryKey: ['planners'], queryFn: apiClient.planners });
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const categories = ['ALL', ...Array.from(new Set((data ?? []).map((p) => p.category)))];
  const q = search.trim().toLowerCase();
  const visible = (data ?? []).filter(
    (p) =>
      (filter === 'ALL' || p.category === filter) &&
      (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold">Planner Marketplace</h1>
      <p className="mt-1 text-sm text-muted">
        Choose a planner and we&apos;ll generate a complete 12-section plan in seconds.
      </p>

      {/* Search */}
      {!isLoading && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search planners…"
          className="mt-6 w-full max-w-sm rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      )}

      {/* Category filter chips */}
      {!isLoading && (
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                filter === cat
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border text-muted hover:border-brand hover:text-fg'
              }`}
            >
              {cat === 'ALL' ? 'All planners' : CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      {/* Unified responsive grid — fills the width, no wasted space */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-card" />
          ))}

        {visible.map((pl) => (
          <Link
            key={pl.slug}
            href={`/planners/${pl.slug}`}
            className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:border-brand hover:shadow-lg hover:shadow-brand/5"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-3xl">{ICONS[pl.icon ?? 'Sparkles'] ?? '✨'}</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                {CATEGORY_LABELS[pl.category] ?? pl.category}
              </span>
            </div>
            <p className="font-semibold group-hover:text-brand">{pl.name}</p>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-muted">{pl.description}</p>
            <p className="mt-4 font-mono text-xs text-brand">Start plan →</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
