'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient, api } from '@/lib/api';

interface InputField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multi-select' | 'range' | 'date';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
  helpText?: string;
}

export default function PlannerFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const { data: planner, isLoading } = useQuery({
    queryKey: ['planner', slug],
    queryFn: () => apiClient.getPlanner(slug),
  });

  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields: InputField[] = (planner?.inputSchema?.inputFields ?? []) as InputField[];

  function setValue(name: string, value: string | number) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // goal is either a dedicated field or we build it from form data
      const goal = (formData['goal'] as string) ?? `${planner?.name} plan`;
      const plan = await api<{ id: string }>('/plans', {
        method: 'POST',
        body: JSON.stringify({
          plannerId: planner?.id,
          title: `${planner?.name} — ${new Date().toLocaleDateString()}`,
          formData,
          goal,
        }),
      });
      router.push(`/plans/${plan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan');
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-card" />
          ))}
        </div>
      </main>
    );
  }

  if (!planner) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-red-400">Planner not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-brand">
          {planner.category}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{planner.name}</h1>
        <p className="mt-1 text-sm text-muted">{planner.description}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="mb-1.5 block text-sm font-medium text-fg">
              {field.label}
              {field.required && <span className="ml-1 text-brand">*</span>}
            </label>

            {field.helpText && (
              <p className="mb-1.5 text-xs text-muted">{field.helpText}</p>
            )}

            {field.type === 'textarea' && (
              <textarea
                required={field.required}
                placeholder={field.placeholder}
                rows={3}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none"
                value={(formData[field.name] as string) ?? ''}
                onChange={(e) => setValue(field.name, e.target.value)}
              />
            )}

            {field.type === 'select' && (
              <select
                required={field.required}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none"
                value={(formData[field.name] as string) ?? ''}
                onChange={(e) => setValue(field.name, e.target.value)}
              >
                <option value="">Select…</option>
                {field.options?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}

            {field.type === 'range' && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={field.min ?? 1}
                  max={field.max ?? 10}
                  step={field.step ?? 1}
                  className="h-1.5 w-full accent-brand"
                  value={(formData[field.name] as number) ?? Math.round(((field.min ?? 1) + (field.max ?? 10)) / 2)}
                  onChange={(e) => setValue(field.name, Number(e.target.value))}
                />
                <span className="w-6 text-center font-mono text-sm text-brand">
                  {(formData[field.name] as number) ?? Math.round(((field.min ?? 1) + (field.max ?? 10)) / 2)}
                </span>
              </div>
            )}

            {(field.type === 'text' || field.type === 'number' || field.type === 'date') && (
              <input
                type={field.type}
                required={field.required}
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none"
                value={(formData[field.name] as string) ?? ''}
                onChange={(e) =>
                  setValue(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)
                }
              />
            )}
          </div>
        ))}

        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 font-semibold text-neutral-950 transition-opacity disabled:opacity-50"
        >
          {submitting ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent" />
              Generating your plan…
            </>
          ) : (
            'Generate Plan'
          )}
        </button>
      </form>
    </main>
  );
}
