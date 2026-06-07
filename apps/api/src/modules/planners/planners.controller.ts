import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('planners')
export class PlannersController {
  constructor(private readonly prisma: PrismaService) {}

  /** Marketplace listing — active planners ordered for display. */
  @Get()
  list() {
    return this.prisma.planner.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    return this.prisma.planner.findUnique({ where: { slug } });
  }
}
