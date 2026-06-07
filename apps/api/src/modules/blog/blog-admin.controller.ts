import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { BlogService } from './blog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ZodBody } from '../../common/zod-validation.pipe';

const CreateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and dashes only'),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  content: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()).optional(),
  coverImage: z.string().url().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});
const UpdateSchema = CreateSchema.partial();

@Controller('admin/blog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class BlogAdminController {
  constructor(private readonly blog: BlogService) {}

  @Get()
  list() {
    return this.blog.listAll();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.blog.getById(id);
  }

  @Post()
  create(
    @CurrentUser() me: AuthUser,
    @Body(new ZodBody(CreateSchema)) body: z.infer<typeof CreateSchema>,
  ) {
    return this.blog.create({ ...body, coverImage: body.coverImage || undefined }, me.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodBody(UpdateSchema)) body: z.infer<typeof UpdateSchema>,
  ) {
    return this.blog.update(id, { ...body, coverImage: body.coverImage || undefined });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blog.remove(id);
  }
}
