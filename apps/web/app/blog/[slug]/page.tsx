import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 3600;

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  coverImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  updatedAt: string;
  author: { name: string | null } | null;
}

async function getPost(slug: string): Promise<Post | null> {
  try {
    const res = await fetch(`${API}/api/blog/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Pre-render all published posts at build time
export async function generateStaticParams() {
  try {
    const res = await fetch(`${API}/api/blog/slugs`);
    if (!res.ok) return [];
    const slugs = (await res.json()) as Array<{ slug: string }>;
    return slugs.map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Post not found' };
  const title = post.seoTitle ?? `${post.title} | PlanForge AI`;
  const description = post.seoDescription ?? post.excerpt;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title, description, type: 'article',
      url: `${SITE}/blog/${post.slug}`,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  // JSON-LD Article structured data for rich results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: post.author?.name ?? 'PlanForge AI' },
    publisher: { '@type': 'Organization', name: 'PlanForge AI' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/blog/${post.slug}` },
    ...(post.coverImage ? { image: post.coverImage } : {}),
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="mb-8 text-sm">
        <Link href="/blog" className="text-muted hover:text-brand">← All posts</Link>
      </nav>

      <p className="font-mono text-xs uppercase tracking-widest text-brand">{post.category}</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">{post.title}</h1>
      {post.publishedAt && (
        <p className="mt-3 text-sm text-muted">
          {new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          {post.author?.name ? ` · ${post.author.name}` : ''}
        </p>
      )}

      {/* Authored by SUPER_ADMIN via TipTap — rendered as HTML */}
      <article
        className="prose-content mt-8"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {post.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <span key={t} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">#{t}</span>
          ))}
        </div>
      )}

      <div className="mt-12 rounded-xl border border-brand/30 bg-brand/5 p-6 text-center">
        <p className="font-semibold">Build your own {post.category} plan with AI.</p>
        <Link href="/login" className="mt-3 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-neutral-950">
          Start free →
        </Link>
      </div>
    </main>
  );
}
