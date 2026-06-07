import { Controller, Get, Param, Query } from '@nestjs/common';
import { BlogService } from './blog.service';

/** Public, unauthenticated blog endpoints (powers the SEO pages). */
@Controller('blog')
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Get()
  list(@Query('category') category?: string) {
    return this.blog.listPublished(category);
  }

  @Get('categories')
  categories() {
    return this.blog.categories();
  }

  @Get('slugs')
  slugs() {
    return this.blog.publishedSlugs();
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    return this.blog.getPublishedBySlug(slug);
  }
}
