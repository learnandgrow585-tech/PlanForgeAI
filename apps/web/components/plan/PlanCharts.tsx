'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import type { PlanJSON } from '@planforge/shared-types';

const BRAND = '#3fb950';
const COLORS = ['#3fb950', '#58a6ff', '#bc8cff', '#f0883e', '#e3b341', '#f85149'];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">{title}</h3>
      {children}
    </div>
  );
}

export function PlanCharts({
  plan,
  milestones,
}: {
  plan: PlanJSON;
  milestones: Array<{ status: string }>;
}) {
  // ── Milestone completion donut ──────────────────────────────
  const completed = milestones.filter((m) => m.status === 'COMPLETED').length;
  const remaining = Math.max(milestones.length - completed, 0);
  const milestoneData = [
    { name: 'Completed', value: completed },
    { name: 'Remaining', value: remaining },
  ];

  // ── Effort by action item (bar) ─────────────────────────────
  const effortData = (plan.actionPlan ?? []).map((a, i) => ({
    name: a.due || `Step ${i + 1}`,
    hours: a.effortHours ?? 0,
  }));

  // ── Cumulative effort across timeline phases (area) ─────────
  let cumulative = 0;
  const phaseData = (plan.timeline?.phases ?? []).map((p) => {
    const weeks = Math.max(p.endWeek - p.startWeek + 1, 1);
    cumulative += weeks;
    return { name: p.label, weeks, cumulative };
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {milestones.length > 0 && (
        <Card title="Milestone Progress">
          <div className="relative">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={milestoneData}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={80}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  <Cell fill={BRAND} />
                  <Cell fill="#21262d" />
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-brand">
                {milestones.length ? Math.round((completed / milestones.length) * 100) : 0}%
              </span>
              <span className="text-xs text-muted">{completed}/{milestones.length} done</span>
            </div>
          </div>
        </Card>
      )}

      {effortData.length > 0 && (
        <Card title="Effort by Action (hours)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={effortData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: 'rgba(63,185,80,0.08)' }}
                contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3' }}
              />
              <Bar dataKey="hours" fill={BRAND} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {phaseData.length > 0 && (
        <Card title="Timeline (cumulative weeks)">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={phaseData}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3' }}
              />
              <Area type="monotone" dataKey="cumulative" stroke={BRAND} strokeWidth={2} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {(plan.progressTracking?.metrics?.length ?? 0) > 0 && (
        <Card title="Target Metrics">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={plan.progressTracking.metrics} layout="vertical">
              <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fill: '#8b949e', fontSize: 10 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(88,166,255,0.08)' }}
                contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3' }}
              />
              <Bar dataKey="target" radius={[0, 4, 4, 0]}>
                {plan.progressTracking.metrics.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
