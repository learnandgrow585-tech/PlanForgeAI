import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { KnowledgeHubService } from './knowledge-hub.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@Controller('knowledge-hub')
@UseGuards(JwtAuthGuard)
export class KnowledgeHubController {
  constructor(
    private readonly hub: KnowledgeHubService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('plan/:planId')
  forPlan(@CurrentUser() user: AuthUser, @Param('planId') planId: string) {
    return this.resolve(user.sub, planId, false);
  }

  @Post('plan/:planId/refresh')
  refresh(@CurrentUser() user: AuthUser, @Param('planId') planId: string) {
    return this.resolve(user.sub, planId, true);
  }

  /** Resources scoped to a single milestone — far more relevant than plan-level. */
  @Get('milestone/:milestoneId')
  async forMilestone(@CurrentUser() user: AuthUser, @Param('milestoneId') milestoneId: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { plan: { include: { planner: true } } },
    });
    if (!milestone || milestone.plan.userId !== user.sub) {
      return { topic: '', videos: [], blogs: [], youtubeEnabled: this.hub.youtubeEnabled };
    }
    // Query = milestone title + planner context (e.g. "Build emergency fund personal finance")
    const category = milestone.plan.planner.category.replace(/_/g, ' ').toLowerCase();
    const topic = `${milestone.title} ${category}`.slice(0, 100);
    return this.hub.getResources(topic, 'intermediate', false);
  }

  private async resolve(userId: string, planId: string, force: boolean) {
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, userId },
      include: { planner: true },
    });
    if (!plan) return { topic: '', videos: [], blogs: [], youtubeEnabled: this.hub.youtubeEnabled };

    const schema = plan.planner.inputSchema as { knowledgeHubConfig?: { keywords?: string[] } };
    const keywords = schema.knowledgeHubConfig?.keywords ?? [];
    // Build a focused search topic from the plan + planner
    const topic = [plan.title, plan.planner.name, ...keywords].filter(Boolean).join(' ').slice(0, 100);

    return this.hub.getResources(topic, 'intermediate', force);
  }
}
