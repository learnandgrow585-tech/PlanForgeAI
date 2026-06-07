import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface BlogUpsert {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags?: string[];
  coverImage?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  seoTitle?: string;
  seoDescription?: string;
}

const cardSelect = {
  id: true, slug: true, title: true, excerpt: true, category: true,
  tags: true, coverImage: true, publishedAt: true,
};

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Public ────────────────────────────────────────────────
  listPublished(category?: string) {
    return this.prisma.blogPost.findMany({
      where: { status: 'PUBLISHED', ...(category ? { category } : {}) },
      orderBy: { publishedAt: 'desc' },
      select: cardSelect,
    });
  }

  async getPublishedBySlug(slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: { author: { select: { name: true } } },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async publishedSlugs() {
    const posts = await this.prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
    });
    return posts;
  }

  categories() {
    return this.prisma.blogPost.groupBy({
      by: ['category'],
      where: { status: 'PUBLISHED' },
      _count: { _all: true },
    });
  }

  // ── Admin ─────────────────────────────────────────────────
  listAll() {
    return this.prisma.blogPost.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  async getById(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async create(data: BlogUpsert, authorId: string) {
    const existing = await this.prisma.blogPost.findUnique({ where: { slug: data.slug } });
    if (existing) throw new ConflictException('A post with this slug already exists');
    return this.prisma.blogPost.create({
      data: {
        ...data,
        tags: data.tags ?? [],
        authorId,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
      },
    });
  }

  async update(id: string, data: Partial<BlogUpsert>) {
    const current = await this.getById(id);
    // Stamp publishedAt the first time it goes live
    const publishedAt =
      data.status === 'PUBLISHED' && current.status !== 'PUBLISHED' ? new Date() : current.publishedAt;
    return this.prisma.blogPost.update({
      where: { id },
      data: { ...data, publishedAt },
    });
  }

  async remove(id: string) {
    await this.prisma.blogPost.delete({ where: { id } });
    return { deleted: true };
  }
}
