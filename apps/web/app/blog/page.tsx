import Link from 'next/link';
import type { Metadata } from 'next';

export const revalidate = 3600; // ISR — rebuild at most hourly

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const metadata: Metadata = {
  title: 'Blog — Planning guides for wealth, career, fitness & more | PlanForge AI',
  description:
    'Practical, AI-assisted planning guides on building wealth, switching careers, getting fit, launching startups and more.',
  alternates: { canonical: '/blog' },
};

interface PostCard {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  publishedAt: string | null;
}

async function getPosts(): Promise<PostCard[]> {
  try {
    const res = await fetch(`${API}/api/blog`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function BlogIndex() {
  const posts = await getPosts();
  const categories = Array.from(new Set(posts.map((p) => p.category)));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10">
        <Link href="/" className="font-mono text-sm font-semibold text-brand">$ planforge-ai</Link>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">The PlanForge Blog</h1>
        <p className="mt-2 text-muted">
          Practical planning guides — wealth, career, fitness, startups and more.
        </p>
        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link key={c} href={`/blog/category/${c}`}
                className="rounded-full border border-border px-3 py-1 text-xs capitalize text-muted hover:border-brand hover:text-brand">
                {c}
              </Link>
            ))}
          </div>
        )}
      </header>

      {posts.length === 0 ? (
        <p className="text-muted">No posts published yet.</p>
      ) : (
        <div className="space-y-6">
          {posts.map((p) => (
            <article key={p.slug} className="border-b border-border pb-6">
              <Link href={`/blog/${p.slug}`} className="group">
                <p className="font-mono text-xs uppercase tracking-widest text-brand">{p.category}</p>
                <h2 className="mt-1 text-2xl font-semibold group-hover:text-brand">{p.title}</h2>
                <p className="mt-2 text-muted">{p.excerpt}</p>
                {p.publishedAt && (
                  <p className="mt-2 text-xs text-muted">
                    {new Date(p.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </Link>
            </article>
          ))}
        </div>
      )}

      <div className="mt-12 rounded-xl border border-brand/30 bg-brand/5 p-6 text-center">
        <p className="font-semibold">Turn any goal into a step-by-step plan.</p>
        <Link href="/login" className="mt-3 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-neutral-950">
          Try PlanForge AI free →
        </Link>
      </div>
    </main>
  );
}
