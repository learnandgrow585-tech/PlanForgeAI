'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminClient, type AdminPlanner } from '@/lib/api';

const CATEGORIES = [
  'WEALTH', 'GOAL', 'CAREER', 'FITNESS', 'STARTUP', 'RETIREMENT', 'EDUCATION',
  'VEHICLE', 'HOUSE_CONSTRUCTION', 'ENGINEERING', 'TRAVEL', 'RELATIONSHIP', 'PRODUCTIVITY', 'OTHER',
];

const BLANK_SCHEMA = JSON.stringify(
  {
    preferredModelTier: 'flash',
    inputFields: [
      { name: 'goal', label: 'What is your goal?', type: 'textarea', required: true },
    ],
    knowledgeHubConfig: { enabled: true, keywords: [] },
  },
  null,
  2,
);

interface FormState {
  id?: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  order: number;
  isActive: boolean;
  systemPromptTemplate: string;
  inputSchemaText: string;
}

const emptyForm: FormState = {
  slug: '', name: '', category: 'OTHER', description: '', icon: 'Sparkles',
  order: 0, isActive: true, systemPromptTemplate: '', inputSchemaText: BLANK_SCHEMA,
};

export default function AdminPlanners() {
  const qc = useQueryClient();
  const { data: planners, isLoading } = useQuery({ queryKey: ['admin-planners'], queryFn: adminClient.planners });
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-planners'] });
    qc.invalidateQueries({ queryKey: ['planners'] }); // marketplace
  };

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      let inputSchema: unknown;
      try {
        inputSchema = JSON.parse(f.inputSchemaText);
      } catch {
        throw new Error('Input schema is not valid JSON');
      }
      const payload = {
        slug: f.slug, name: f.name, category: f.category, description: f.description,
        icon: f.icon, order: Number(f.order), isActive: f.isActive,
        systemPromptTemplate: f.systemPromptTemplate, inputSchema,
      };
      return f.id ? adminClient.updatePlanner(f.id, payload) : adminClient.createPlanner(payload);
    },
    onSuccess: () => { setForm(null); setError(null); invalidate(); },
    onError: (e) => setError(e instanceof Error ? e.message : 'Save failed'),
  });

  const toggle = useMutation({
    mutationFn: (p: AdminPlanner) => adminClient.updatePlanner(p.id, { isActive: !p.isActive }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminClient.deletePlanner(id),
    onSuccess: (res) => { if (res.disabled) alert(res.reason); invalidate(); },
  });

  function editPlanner(p: AdminPlanner) {
    setError(null);
    setForm({
      id: p.id, slug: p.slug, name: p.name, category: p.category, description: p.description,
      icon: p.icon, order: p.order, isActive: p.isActive,
      systemPromptTemplate: p.systemPromptTemplate,
      inputSchemaText: JSON.stringify(p.inputSchema, null, 2),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Create and edit planners live — changes apply instantly, no deploy.</p>
        <button
          onClick={() => { setError(null); setForm({ ...emptyForm }); }}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-neutral-950 hover:opacity-90"
        >
          + New planner
        </button>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-xl bg-card" />}

      <div className="space-y-2">
        {planners?.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{p.name}</p>
                <span className="font-mono text-xs text-muted">/{p.slug}</span>
                {!p.isActive && <span className="rounded-full bg-red-900/30 px-2 py-0.5 text-xs text-red-300">disabled</span>}
              </div>
              <p className="text-xs text-muted">{p.category} · order {p.order}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggle.mutate(p)} className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-fg">
                {p.isActive ? 'Disable' : 'Enable'}
              </button>
              <button onClick={() => editPlanner(p)} className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-brand">
                Edit
              </button>
              <button
                onClick={() => { if (confirm(`Delete ${p.name}?`)) remove.mutate(p.id); }}
                className="rounded border border-border px-2 py-1 text-xs text-muted hover:border-red-500 hover:text-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Create / Edit form ── */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-6">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-bg p-6">
            <h2 className="mb-4 text-lg font-bold">{form.id ? `Edit ${form.name}` : 'New planner'}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Slug">
                  <input disabled={!!form.id} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="my-planner" className="inp disabled:opacity-50" />
                </Field>
                <Field label="Name">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="inp" />
                </Field>
                <Field label="Category">
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="inp">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Icon (emoji name)">
                  <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="inp" placeholder="Sparkles" />
                </Field>
                <Field label="Order">
                  <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="inp" />
                </Field>
                <Field label="Active">
                  <label className="flex items-center gap-2 pt-2 text-sm">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-brand" />
                    Visible in marketplace
                  </label>
                </Field>
              </div>
              <Field label="Description">
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="inp" />
              </Field>
              <Field label="System prompt template">
                <textarea rows={3} value={form.systemPromptTemplate} onChange={(e) => setForm({ ...form, systemPromptTemplate: e.target.value })} className="inp font-mono text-xs" />
              </Field>
              <Field label="Input schema (JSON)">
                <textarea rows={10} value={form.inputSchemaText} onChange={(e) => setForm({ ...form, inputSchemaText: e.target.value })} className="inp font-mono text-xs" />
              </Field>

              {error && <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setForm(null)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-fg">Cancel</button>
                <button onClick={() => save.mutate(form)} disabled={save.isPending}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50">
                  {save.isPending ? 'Saving…' : 'Save planner'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(var(--border)); background: rgb(var(--card)); padding: 0.5rem 0.75rem; font-size: 0.875rem; color: rgb(var(--fg)); }
        .inp:focus { outline: none; border-color: #3fb950; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}
