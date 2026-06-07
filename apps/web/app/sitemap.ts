import type { MetadataRoute } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/blog`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/login`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  try {
    const res = await fetch(`${API}/api/blog/slugs`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const slugs = (await res.json()) as Array<{ slug: string; updatedAt: string }>;
      return [
        ...staticRoutes,
        ...slugs.map((s) => ({
          url: `${SITE}/blog/${s.slug}`,
          lastModified: new Date(s.updatedAt),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        })),
      ];
    }
  } catch {
    /* fall back to static routes */
  }
  return staticRoutes;
}
