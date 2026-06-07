import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

/**
 * Full-text-ish search across planners (public catalogue) and the current
 * user's plans. Uses case-insensitive matching on names/titles/descriptions.
 */
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async search(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    const query = (q ?? '').trim();
    if (query.length < 2) return { planners: [], plans: [] };

    const [planners, plans] = await Promise.all([
      this.prisma.planner.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { slug: true, name: true, description: true, category: true, icon: true },
        take: 8,
      }),
      this.prisma.plan.findMany({
        where: { userId: user.sub, title: { contains: query, mode: 'insensitive' } },
        select: { id: true, title: true, status: true, planner: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),
    ]);

    return {
      planners,
      plans: plans.map((p) => ({ id: p.id, title: p.title, status: p.status, plannerName: p.planner.name })),
    };
  }
}
