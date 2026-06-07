'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, api } from '@/lib/api';
import { PlanCharts } from '@/components/plan/PlanCharts';
import { MilestoneResources } from '@/components/plan/MilestoneResources';
import type { PlanJSON } from '@planforge/shared-types';

// ── Small helper components ───────────────────────────────────
function Badge({ children, color = 'brand' }: { children: React.ReactNode; color?: 'brand' | 'blue' | 'yellow' | 'red' }) {
  const cls = {
    brand: 'bg-brand/10 text-brand',
    blue: 'bg-blue-900/30 text-blue-300',
    yellow: 'bg-yellow-900/30 text-yellow-300',
    red: 'bg-red-900/30 text-red-300',
  }[color];
  return <span className={`rounded-full px-2 py-0.5 font-mono text-xs ${cls}`}>{children}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">{title}</h3>
      {children}
    </div>
  );
}

function SuccessGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#3fb950' : score >= 40 ? '#e3b341' : '#f85149';
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1c2128" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="50" y="55" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold">
          {score}%
        </text>
      </svg>
      <p className="text-xs text-muted">Success probability</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'actions' | 'milestones' | 'risks' | 'resources' | 'knowledge'>('actions');
  const [reviseNote, setReviseNote] = useState('');
  const [revising, setRevising] = useState(false);

  const [newMilestone, setNewMilestone] = useState('');

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ['plan', id],
    queryFn: () => apiClient.getPlan(id),
    // While the plan is still generating (DRAFT), poll every 2s.
    refetchInterval: (q) => (q.state.data?.status === 'DRAFT' ? 2000 : false),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['plan', id] });

  const reviseMutation = useMutation({
    mutationFn: () =>
      api<void>(`/plans/${id}/revise`, {
        method: 'POST',
        body: JSON.stringify({ note: reviseNote }),
      }),
    onSuccess: () => {
      setReviseNote('');
      setRevising(false);
      invalidate();
    },
  });

  const completeMilestone = useMutation({
    mutationFn: (milestoneId: string) => apiClient.toggleMilestone(id, milestoneId),
    onSuccess: invalidate,
  });
  const addMilestone = useMutation({
    mutationFn: (title: string) => apiClient.addMilestone(id, title),
    onSuccess: () => { setNewMilestone(''); invalidate(); },
  });
  const reorder = useMutation({
    mutationFn: (v: { mid: string; dir: 'up' | 'down' }) => apiClient.reorderMilestone(id, v.mid, v.dir),
    onSuccess: invalidate,
  });
  const removeMilestone = useMutation({
    mutationFn: (mid: string) => apiClient.deleteMilestone(id, mid),
    onSuccess: invalidate,
  });

  const deletePlan = useMutation({
    mutationFn: () => api<void>(`/plans/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      router.push('/plans');
    },
  });

  const retryGen = useMutation({
    mutationFn: () => apiClient.retryPlan(id),
    onSuccess: invalidate,
  });

  // Knowledge Hub — fetched lazily only when its tab is opened (saves AI quota)
  const knowledge = useQuery({
    queryKey: ['knowledge', id],
    queryFn: () => apiClient.knowledge(id),
    enabled: activeTab === 'knowledge',
    staleTime: 1000 * 60 * 60,
  });
  const refreshKnowledge = useMutation({
    mutationFn: () => apiClient.refreshKnowledge(id),
    onSuccess: (data) => qc.setQueryData(['knowledge', id], data),
  });

  // ── Generating state — plan exists but AI hasn't finished ──
  if (plan && plan.status === 'DRAFT') {
    // A plan whose updatedAt is well in the past is orphaned (no active generation).
    const ageSeconds = (Date.now() - new Date(plan.updatedAt).getTime()) / 1000;
    const stuck = ageSeconds > 60;
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
        {!stuck ? (
          <>
            <div className="mb-6 h-14 w-14 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            <h1 className="text-xl font-bold">Generating your plan…</h1>
            <p className="mt-2 text-sm text-muted">
              The AI is building your 12-section plan — strategy, milestones, risks and resources.
              This usually takes 5–15 seconds.
            </p>
            <p className="mt-1 font-mono text-xs text-muted">{plan.title}</p>
          </>
        ) : (
          <>
            <div className="mb-4 text-4xl">⚠️</div>
            <h1 className="text-xl font-bold">This plan didn&apos;t finish generating</h1>
            <p className="mt-2 max-w-md text-sm text-muted">
              Generation was interrupted (often an old draft or a server restart). You can retry it
              with the same inputs, or delete it.
            </p>
            <p className="mt-1 font-mono text-xs text-muted">{plan.title}</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => retryGen.mutate()}
                disabled={retryGen.isPending}
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-neutral-950 disabled:opacity-50"
              >
                {retryGen.isPending ? 'Retrying…' : '↻ Retry generation'}
              </button>
              <button
                onClick={() => deletePlan.mutate()}
                disabled={deletePlan.isPending}
                className="rounded-lg border border-border px-5 py-2.5 text-sm text-muted hover:border-red-500 hover:text-red-400"
              >
                🗑 Delete
              </button>
            </div>
          </>
        )}
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      </main>
    );
  }

  if (error || !plan) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-red-400">Plan not found or you don't have access.</p>
      </main>
    );
  }

  const planData: PlanJSON = plan.planData;
  const milestones = plan.milestones ?? [];

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'actions', label: 'Action Plan' },
    { key: 'milestones', label: `Milestones (${milestones.length})` },
    { key: 'risks', label: 'Risks' },
    { key: 'resources', label: 'Resources' },
    { key: 'knowledge', label: 'Knowledge Hub' },
  ] as const;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      {/* Header ─────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            {plan.plannerName}
          </p>
          <h1 className="mt-1 text-2xl font-bold">{plan.title}</h1>
          <p className="mt-1 text-sm text-muted">
            Created {new Date(plan.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={plan.status === 'ACTIVE' ? 'brand' : 'blue'}>{plan.status}</Badge>
          <button
            onClick={() => {
              if (confirm('Delete this plan permanently? This cannot be undone.')) {
                deletePlan.mutate();
              }
            }}
            disabled={deletePlan.isPending}
            className="rounded-md border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-red-500 hover:text-red-400 disabled:opacity-50"
          >
            {deletePlan.isPending ? 'Deleting…' : '🗑 Delete'}
          </button>
        </div>
      </div>

      {/* Top metrics row ─────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 sm:col-span-1 flex items-center justify-center">
          <SuccessGauge score={planData.successProbability?.score ?? 0} />
        </div>
        <div className="sm:col-span-3 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted">Milestones</p>
            <p className="mt-1 text-2xl font-bold">{milestones.length}</p>
            <p className="text-xs text-muted">
              {milestones.filter((m) => m.status === 'COMPLETED').length} completed
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted">Action items</p>
            <p className="mt-1 text-2xl font-bold">{planData.actionPlan?.length ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted">Risks flagged</p>
            <p className="mt-1 text-2xl font-bold">{planData.riskAssessment?.length ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Tabs ────────────────────────────────────────── */}
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-border pb-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'border-b-2 border-brand text-brand'
                : 'text-muted hover:text-fg'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content ─────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Visual analytics */}
          <PlanCharts plan={planData} milestones={milestones} />

          {/* Executive summary */}
          <Section title="Executive Summary">
            <p className="text-sm leading-relaxed text-fg">{planData.executiveSummary}</p>
          </Section>

          {/* Current state */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Section title="Strengths">
              <ul className="space-y-1">
                {planData.currentState?.strengths?.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-fg">
                    <span className="text-brand">✓</span> {s}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Gaps to Close">
              <ul className="space-y-1">
                {planData.gapAnalysis?.gaps?.map((g, i) => (
                  <li key={i} className="flex gap-2 text-sm text-fg">
                    <span className="text-yellow-400">→</span> {g}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          {/* Strategy pillars */}
          <Section title="Strategy">
            <p className="mb-3 text-sm text-fg">{planData.strategy?.summary}</p>
            <div className="flex flex-wrap gap-2">
              {planData.strategy?.pillars?.map((p, i) => (
                <span key={i} className="rounded-full border border-brand/30 px-3 py-1 text-xs text-brand">
                  {p}
                </span>
              ))}
            </div>
          </Section>

          {/* Success rationale */}
          <Section title="Success Probability Rationale">
            <p className="text-sm leading-relaxed text-fg">
              {planData.successProbability?.rationale}
            </p>
          </Section>

          {/* Recommendations */}
          <Section title="Key Recommendations">
            <ul className="space-y-2">
              {planData.recommendations?.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm text-fg">
                  <span className="mt-0.5 font-mono text-xs text-muted">{String(i + 1).padStart(2, '0')}</span>
                  {r}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="space-y-3">
          {/* Start here banner */}
          <div className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3">
            <span className="mt-0.5 text-lg">👆</span>
            <div>
              <p className="text-sm font-semibold text-brand">Start with Step 01</p>
              <p className="text-xs text-muted">
                Work through these actions in order. Complete each one before moving to the next.
                Check off milestones as you go.
              </p>
            </div>
          </div>

          {planData.actionPlan?.map((item, i) => (
            <div
              key={i}
              className={`flex gap-4 rounded-xl border p-4 ${
                i === 0
                  ? 'border-brand/40 bg-brand/5'          // first step highlighted
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span className={`font-mono text-sm font-bold ${i === 0 ? 'text-brand' : 'text-muted'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {i === 0 && (
                  <span className="rounded-full bg-brand px-1.5 py-0.5 font-mono text-[9px] font-bold text-neutral-950">
                    NOW
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${i === 0 ? 'text-brand' : ''}`}>{item.title}</p>
                <p className="mt-0.5 text-sm text-muted">{item.description}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.due && (
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                      📅 {item.due}
                    </span>
                  )}
                  {item.effortHours && (
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                      ⏱ {item.effortHours}h
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Link to milestones */}
          {milestones.length > 0 && (
            <button
              onClick={() => setActiveTab('milestones')}
              className="w-full rounded-xl border border-dashed border-border py-3 text-sm text-muted hover:border-brand hover:text-brand transition-colors"
            >
              Track your progress → View {milestones.length} milestones
            </button>
          )}
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="space-y-3">
          {/* Progress bar */}
          {milestones.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted">Progress</span>
                <span className="font-mono text-brand">
                  {milestones.filter((m) => m.status === 'COMPLETED').length}/{milestones.length}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full bg-brand transition-all"
                  style={{
                    width: `${Math.round(
                      (milestones.filter((m) => m.status === 'COMPLETED').length / milestones.length) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {milestones.length === 0 && (
            <p className="text-sm text-muted">No milestones yet — add your first below.</p>
          )}

          {milestones.map((m, i) => (
            <div
              key={m.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
              <button
                onClick={() => completeMilestone.mutate(m.id)}
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  m.status === 'COMPLETED'
                    ? 'border-brand bg-brand text-neutral-950'
                    : 'border-border hover:border-brand'
                }`}
                title={m.status === 'COMPLETED' ? 'Mark incomplete' : 'Mark complete'}
              >
                {m.status === 'COMPLETED' && '✓'}
              </button>
              <div className="flex-1">
                <p className={`font-medium ${m.status === 'COMPLETED' ? 'text-muted line-through' : ''}`}>
                  {m.title}
                </p>
                {m.targetDate && (
                  <p className="text-xs text-muted">Due {new Date(m.targetDate).toLocaleDateString()}</p>
                )}
              </div>
              {/* Reorder + delete controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => reorder.mutate({ mid: m.id, dir: 'up' })}
                  disabled={i === 0}
                  className="rounded px-1.5 py-0.5 text-muted hover:text-fg disabled:opacity-30"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => reorder.mutate({ mid: m.id, dir: 'down' })}
                  disabled={i === milestones.length - 1}
                  className="rounded px-1.5 py-0.5 text-muted hover:text-fg disabled:opacity-30"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => removeMilestone.mutate(m.id)}
                  className="rounded px-1.5 py-0.5 text-muted hover:text-red-400"
                  title="Delete milestone"
                >
                  ×
                </button>
              </div>
              </div>
              <MilestoneResources milestoneId={m.id} />
            </div>
          ))}

          {/* Add custom milestone */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newMilestone.trim()) addMilestone.mutate(newMilestone.trim());
            }}
            className="flex gap-2"
          >
            <input
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              placeholder="Add your own milestone…"
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newMilestone.trim() || addMilestone.isPending}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </div>
      )}

      {activeTab === 'risks' && (
        <div className="space-y-3">
          {planData.riskAssessment?.map((risk, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{risk.risk}</p>
                <div className="flex gap-2">
                  <Badge color={risk.likelihood === 'HIGH' ? 'red' : risk.likelihood === 'MEDIUM' ? 'yellow' : 'brand'}>
                    {risk.likelihood}
                  </Badge>
                  <Badge color={risk.impact === 'HIGH' ? 'red' : risk.impact === 'MEDIUM' ? 'yellow' : 'brand'}>
                    {risk.impact} impact
                  </Badge>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted">
                <span className="text-muted">Mitigation:</span> {risk.mitigation}
              </p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="space-y-3">
          {planData.learningResources?.map((r, i) => (
            <div key={i} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
              <Badge color="blue">{r.type}</Badge>
              <div>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                    className="font-medium hover:text-brand">
                    {r.title} ↗
                  </a>
                ) : (
                  <p className="font-medium">{r.title}</p>
                )}
                {r.note && <p className="mt-0.5 text-sm text-muted">{r.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              AI-curated videos and articles for this plan.
            </p>
            <button
              onClick={() => refreshKnowledge.mutate()}
              disabled={refreshKnowledge.isPending || knowledge.isLoading}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:border-brand hover:text-brand disabled:opacity-50"
            >
              {refreshKnowledge.isPending ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>

          {(knowledge.isLoading || refreshKnowledge.isPending) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-card" />)}
            </div>
          )}

          {knowledge.data && !refreshKnowledge.isPending && (
            <>
              {/* Videos */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Videos</h3>
                {!knowledge.data.youtubeEnabled ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
                    Add a free <span className="font-mono text-brand">YOUTUBE_API_KEY</span> (from
                    console.cloud.google.com) to enable curated videos.
                  </div>
                ) : knowledge.data.videos.length === 0 ? (
                  <p className="text-sm text-muted">No videos found.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {knowledge.data.videos.map((v) => (
                      <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer"
                        className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-brand">
                        {v.thumbnail && <img src={v.thumbnail} alt="" className="aspect-video w-full object-cover" />}
                        <div className="p-3">
                          <p className="line-clamp-2 text-sm font-medium group-hover:text-brand">{v.title}</p>
                          <p className="mt-1 text-xs text-muted">
                            {v.channel} · {v.views.toLocaleString()} views
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Blogs */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Articles</h3>
                {knowledge.data.blogs.length === 0 ? (
                  <p className="text-sm text-muted">No articles found (a Gemini key is required for curation).</p>
                ) : (
                  <div className="space-y-3">
                    {knowledge.data.blogs.map((b, i) => (
                      <a key={i} href={b.url} target="_blank" rel="noopener noreferrer"
                        className="group block rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium group-hover:text-brand">{b.title}</p>
                          <Badge color="blue">{b.difficulty}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted">{b.summary}</p>
                        <p className="mt-2 text-xs text-muted">
                          {b.readingTimeMinutes} min read · 🔍 Find on {b.sourceName} →
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Conversational revision ──────────────────── */}
      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Revise this plan</h3>
        <p className="mb-3 text-xs text-muted">
          Tell the AI what changed — e.g. "I got delayed 2 months" or "My budget doubled."
        </p>
        {revising ? (
          <div className="space-y-3">
            <textarea
              rows={3}
              placeholder="What changed? e.g. I got a new job offer with a higher salary…"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-brand focus:outline-none"
              value={reviseNote}
              onChange={(e) => setReviseNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => reviseMutation.mutate()}
                disabled={!reviseNote.trim() || reviseMutation.isPending}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50"
              >
                {reviseMutation.isPending ? 'Revising…' : 'Apply revision'}
              </button>
              <button
                onClick={() => setRevising(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-fg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setRevising(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:border-brand hover:text-brand"
          >
            + Revise plan
          </button>
        )}
      </div>
    </main>
  );
}
