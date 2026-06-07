import Link from 'next/link';
import type { Metadata } from 'next';

export const revalidate = 3600;
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface PostCard {
  slug: string; title: string; excerpt: string; category: string; publishedAt: string | null;
}

async function getPosts(category: string): Promise<PostCard[]> {
  try {
    const res = await fetch(`${API}/api/blog?category=${encodeURIComponent(category)}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const cap = category.charAt(0).toUpperCase() + category.slice(1);
  return {
    title: `${cap} planning guides | PlanForge AI`,
    description: `AI-assisted ${category} planning guides and how-tos from PlanForge AI.`,
    alternates: { canonical: `/blog/category/${category}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const posts = await getPosts(category);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <nav className="mb-8 text-sm"><Link href="/blog" className="text-muted hover:text-brand">← All posts</Link></nav>
      <h1 className="text-3xl font-bold capitalize">{category} guides</h1>
      <div className="mt-8 space-y-6">
        {posts.length === 0 && <p className="text-muted">No posts in this category yet.</p>}
        {posts.map((p) => (
          <article key={p.slug} className="border-b border-border pb-6">
            <Link href={`/blog/${p.slug}`} className="group">
              <h2 className="text-2xl font-semibold group-hover:text-brand">{p.title}</h2>
              <p className="mt-2 text-muted">{p.excerpt}</p>
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
