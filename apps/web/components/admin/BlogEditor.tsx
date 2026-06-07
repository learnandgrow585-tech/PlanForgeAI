'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminClient } from '@/lib/api';
import { RichTextEditor } from './RichTextEditor';

interface FormState {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string;
  coverImage: string;
  status: 'DRAFT' | 'PUBLISHED';
  seoTitle: string;
  seoDescription: string;
}

const empty: FormState = {
  slug: '', title: '', excerpt: '', content: '<p></p>', category: 'wealth',
  tags: '', coverImage: '', status: 'DRAFT', seoTitle: '', seoDescription: '',
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function BlogEditor({ postId }: { postId?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ['admin-blog', postId],
    queryFn: () => adminClient.blogGet(postId!),
    enabled: !!postId,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        slug: existing.slug, title: existing.title, excerpt: existing.excerpt,
        content: existing.content, category: existing.category, tags: existing.tags.join(', '),
        coverImage: existing.coverImage ?? '', status: existing.status,
        seoTitle: existing.seoTitle ?? '', seoDescription: existing.seoDescription ?? '',
      });
      setSlugEdited(true);
    }
  }, [existing]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const save = useMutation({
    mutationFn: (publish?: boolean) => {
      const payload = {
        slug: form.slug || slugify(form.title),
        title: form.title,
        excerpt: form.excerpt,
        content: form.content,
        category: form.category,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        coverImage: form.coverImage || undefined,
        status: publish ? 'PUBLISHED' : form.status,
        seoTitle: form.seoTitle || undefined,
        seoDescription: form.seoDescription || undefined,
      };
      return postId ? adminClient.blogUpdate(postId, payload) : adminClient.blogCreate(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-blog'] });
      router.push('/admin/blog');
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Save failed'),
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {/* Main */}
      <div className="space-y-4">
        <input
          value={form.title}
          onChange={(e) => { set('title', e.target.value); if (!slugEdited) set('slug', slugify(e.target.value)); }}
          placeholder="Post title"
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-xl font-semibold focus:border-brand focus:outline-none"
        />
        <RichTextEditor value={form.content} onChange={(html) => set('content', html)} />
      </div>

      {/* Sidebar */}
      <aside className="space-y-3">
        <Field label="Slug">
          <input value={form.slug} onChange={(e) => { setSlugEdited(true); set('slug', e.target.value); }} className="binp" placeholder="my-post" />
        </Field>
        <Field label="Category">
          <input value={form.category} onChange={(e) => set('category', e.target.value)} className="binp" placeholder="wealth" />
        </Field>
        <Field label="Excerpt (shown in lists & SEO)">
          <textarea rows={3} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} className="binp" />
        </Field>
        <Field label="Tags (comma-separated)">
          <input value={form.tags} onChange={(e) => set('tags', e.target.value)} className="binp" placeholder="investing, savings" />
        </Field>
        <Field label="Cover image URL (optional)">
          <input value={form.coverImage} onChange={(e) => set('coverImage', e.target.value)} className="binp" placeholder="https://…" />
        </Field>
        <Field label="SEO title (optional)">
          <input value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} className="binp" />
        </Field>
        <Field label="SEO description (optional)">
          <textarea rows={2} value={form.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} className="binp" />
        </Field>

        {error && <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">{error}</p>}

        <div className="flex flex-col gap-2 pt-2">
          <button onClick={() => save.mutate(true)} disabled={save.isPending || !form.title}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50">
            {save.isPending ? 'Saving…' : 'Publish'}
          </button>
          <button onClick={() => save.mutate(false)} disabled={save.isPending || !form.title}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-fg disabled:opacity-50">
            Save as draft
          </button>
        </div>
      </aside>

      <style jsx global>{`
        .binp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(var(--border)); background: rgb(var(--card)); padding: 0.5rem 0.75rem; font-size: 0.875rem; color: rgb(var(--fg)); }
        .binp:focus { outline: none; border-color: #3fb950; }
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
