import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { CacheService } from '../../cache/cache.service';

export interface VideoResult {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  views: number;
  url: string;
}
export interface BlogResult {
  title: string;
  url: string;
  sourceName: string;
  summary: string;
  readingTimeMinutes: number;
  difficulty: string;
}
export interface KnowledgeResult {
  topic: string;
  videos: VideoResult[];
  blogs: BlogResult[];
  youtubeEnabled: boolean;
}

const BlogSchema = z.object({
  title: z.string(),
  url: z.string().optional(), // ignored — LLMs hallucinate deep URLs; we build a search link
  sourceName: z.string().default('Web'),
  summary: z.string().default(''),
  readingTimeMinutes: z.preprocess((v) => {
    const m = String(v ?? '').match(/\d+/);
    return m ? Number(m[0]) : 5;
  }, z.number()),
  difficulty: z.preprocess(
    (v) => String(v ?? 'intermediate').toLowerCase(),
    z.string(),
  ),
});

@Injectable()
export class KnowledgeHubService {
  private readonly logger = new Logger('KnowledgeHub');

  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {}

  get youtubeEnabled(): boolean {
    return !!this.config.get<string>('YOUTUBE_API_KEY');
  }

  /** Google Custom Search key (falls back to the YouTube key — same Google project). */
  private get searchKey(): string {
    return this.config.get<string>('GOOGLE_SEARCH_API_KEY') || this.config.get<string>('YOUTUBE_API_KEY') || '';
  }
  private get searchCx(): string {
    return this.config.get<string>('GOOGLE_SEARCH_CX') || '';
  }
  get realBlogLinks(): boolean {
    return !!(this.searchKey && this.searchCx);
  }

  async getResources(topic: string, level = 'intermediate', force = false): Promise<KnowledgeResult> {
    const key = `kh:${topic.toLowerCase().slice(0, 80)}`;
    if (!force) {
      const cached = await this.cache.get<KnowledgeResult>(key);
      if (cached) return cached;
    }

    const [videos, blogs] = await Promise.all([
      this.fetchVideos(topic).catch((e) => {
        this.logger.warn(`YouTube fetch failed: ${e?.message ?? e}`);
        return [] as VideoResult[];
      }),
      this.fetchBlogs(topic, level).catch((e) => {
        this.logger.warn(`Blog curation failed: ${e?.message ?? e}`);
        return [] as BlogResult[];
      }),
    ]);

    const result: KnowledgeResult = { topic, videos, blogs, youtubeEnabled: this.youtubeEnabled };
    await this.cache.set(key, result, 86_400); // 24h
    return result;
  }

  // ── YouTube (REST, no SDK) — only if a key is configured ──
  private async fetchVideos(query: string): Promise<VideoResult[]> {
    const key = this.config.get<string>('YOUTUBE_API_KEY');
    if (!key) return [];

    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.search = new URLSearchParams({
      key, q: query, part: 'snippet', type: 'video', maxResults: '8', relevanceLanguage: 'en',
    }).toString();
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error(`YouTube search ${searchRes.status}`);
    const search = (await searchRes.json()) as {
      items: Array<{ id: { videoId: string }; snippet: { title: string; channelTitle: string; thumbnails: { medium?: { url: string } } } }>;
    };
    const ids = search.items.map((i) => i.id.videoId).filter(Boolean);
    if (!ids.length) return [];

    const statsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    statsUrl.search = new URLSearchParams({ key, id: ids.join(','), part: 'statistics' }).toString();
    const statsRes = await fetch(statsUrl);
    const stats = statsRes.ok
      ? ((await statsRes.json()) as { items: Array<{ id: string; statistics: { viewCount?: string } }> }).items
      : [];
    const viewsById = new Map(stats.map((s) => [s.id, Number(s.statistics.viewCount ?? 0)]));

    return search.items
      .map((i) => ({
        id: i.id.videoId,
        title: i.snippet.title,
        channel: i.snippet.channelTitle,
        thumbnail: i.snippet.thumbnails.medium?.url ?? '',
        views: viewsById.get(i.id.videoId) ?? 0,
        url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }

  // ── Blogs: real links via Google Custom Search, else Gemini search-links ──
  private async fetchBlogs(topic: string, level: string): Promise<BlogResult[]> {
    if (this.realBlogLinks) {
      const real = await this.fetchBlogsViaSearch(topic);
      if (real.length) return real;
    }
    return this.fetchBlogsViaGemini(topic, level);
  }

  /** Google Programmable Search → real, working article URLs. */
  private async fetchBlogsViaSearch(query: string): Promise<BlogResult[]> {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.search = new URLSearchParams({
      key: this.searchKey, cx: this.searchCx, q: query, num: '6', safe: 'active', lr: 'lang_en',
    }).toString();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Custom Search ${res.status}`);
    const data = (await res.json()) as {
      items?: Array<{ title: string; link: string; snippet?: string; displayLink?: string }>;
    };
    return (data.items ?? []).slice(0, 5).map((it) => ({
      title: it.title,
      url: it.link,
      sourceName: it.displayLink ?? new URL(it.link).hostname.replace(/^www\./, ''),
      summary: it.snippet ?? '',
      readingTimeMinutes: Math.max(3, Math.round((it.snippet?.split(/\s+/).length ?? 60) / 30) + 4),
      difficulty: 'article',
    }));
  }

  /** Fallback: Gemini suggests titles, we link to a web search (no hallucinated URLs). */
  private async fetchBlogsViaGemini(topic: string, level: string): Promise<BlogResult[]> {
    const key = this.config.get<string>('GEMINI_API_KEY');
    const model = this.config.get<string>('GEMINI_FLASH_MODEL', 'gemini-2.5-flash');
    if (!key) return [];

    const prompt =
      `Suggest 5 real, well-known reference topics/guides about "${topic}" for a ${level} learner. ` +
      `Do NOT invent specific URLs. Return ONLY a JSON array (no markdown) of objects: ` +
      `[{"title","sourceName","summary","readingTimeMinutes","difficulty"}]. ` +
      `"title" should be a clear, searchable topic title (e.g. "Index funds explained"). ` +
      `"sourceName" is a reputable site likely to cover it (e.g. Investopedia, NerdWallet, Khan Academy). ` +
      `difficulty is one of beginner, intermediate, advanced.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = (await res.json()) as { candidates?: Array<{ content: { parts: Array<{ text: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';

    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    const json = start !== -1 && end !== -1 ? text.slice(start, end + 1) : '[]';
    const parsed = z.array(BlogSchema).safeParse(JSON.parse(json));
    if (!parsed.success) return [];
    // Build a reliable Google search link (LLM deep URLs 404), preferring the named source.
    return parsed.data.slice(0, 5).map((b) => ({
      title: b.title,
      sourceName: b.sourceName,
      summary: b.summary,
      readingTimeMinutes: b.readingTimeMinutes,
      difficulty: b.difficulty,
      url: `https://www.google.com/search?q=${encodeURIComponent(`${b.title} ${b.sourceName}`)}`,
    }));
  }
}
