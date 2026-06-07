import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const plans = await this.prisma.plan.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { planner: { select: { name: true, icon: true, slug: true } } },
    });
    return plans.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      plannerName: p.planner.name,
      plannerSlug: p.planner.slug,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  async getForUser(userId: string, id: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { id, userId },
      include: {
        milestones: { orderBy: { order: 'asc' } },
        planner: { select: { name: true, slug: true, icon: true } },
      },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return {
      id: plan.id,
      title: plan.title,
      status: plan.status,
      plannerName: plan.planner.name,
      plannerSlug: plan.planner.slug,
      planData: plan.planData,
      milestones: plan.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        targetDate: m.targetDate,
        completedAt: m.completedAt,
        order: m.order,
      })),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      version: plan.version,
    };
  }

  async deleteForUser(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.plan.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Milestones ─────────────────────────────────────────────
  async addMilestone(userId: string, planId: string, title: string, description?: string) {
    await this.assertOwner(userId, planId);
    const max = await this.prisma.milestone.aggregate({
      where: { planId },
      _max: { order: true },
    });
    return this.prisma.milestone.create({
      data: {
        planId,
        title,
        description: description ?? '',
        order: (max._max.order ?? -1) + 1,
        status: 'PENDING',
      },
    });
  }

  /** Toggle a milestone between COMPLETED and PENDING. */
  async toggleMilestone(userId: string, planId: string, milestoneId: string) {
    await this.assertOwner(userId, planId);
    const m = await this.prisma.milestone.findFirst({ where: { id: milestoneId, planId } });
    if (!m) throw new NotFoundException('Milestone not found');
    const completed = m.status === 'COMPLETED';
    return this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: completed ? 'PENDING' : 'COMPLETED',
        completedAt: completed ? null : new Date(),
      },
    });
  }

  async reorderMilestone(userId: string, planId: string, milestoneId: string, direction: 'up' | 'down') {
    await this.assertOwner(userId, planId);
    const list = await this.prisma.milestone.findMany({ where: { planId }, orderBy: { order: 'asc' } });
    const idx = list.findIndex((m) => m.id === milestoneId);
    if (idx === -1) throw new NotFoundException('Milestone not found');
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= list.length) return { reordered: false };
    const a = list[idx]!;
    const b = list[swapWith]!;
    await this.prisma.$transaction([
      this.prisma.milestone.update({ where: { id: a.id }, data: { order: b.order } }),
      this.prisma.milestone.update({ where: { id: b.id }, data: { order: a.order } }),
    ]);
    return { reordered: true };
  }

  async deleteMilestone(userId: string, planId: string, milestoneId: string) {
    await this.assertOwner(userId, planId);
    await this.prisma.milestone.delete({ where: { id: milestoneId } });
    return { deleted: true };
  }

  // ── Dashboard summary ──────────────────────────────────────
  async dashboardSummary(userId: string) {
    const plans = await this.prisma.plan.findMany({
      where: { userId },
      include: {
        planner: { select: { name: true, slug: true } },
        milestones: { orderBy: { order: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86_400_000);

    const upcoming: Array<{ planId: string; planTitle: string; title: string; targetDate: Date | null }> = [];
    const nextActions: Array<{ planId: string; planTitle: string; nextMilestone: string | null }> = [];
    const allCompletions: Date[] = [];

    let totalMilestones = 0;
    let completedMilestones = 0;

    for (const p of plans) {
      totalMilestones += p.milestones.length;
      const next = p.milestones.find((m) => m.status !== 'COMPLETED' && m.status !== 'SKIPPED');
      nextActions.push({ planId: p.id, planTitle: p.title, nextMilestone: next?.title ?? null });

      for (const m of p.milestones) {
        if (m.status === 'COMPLETED') {
          completedMilestones++;
          if (m.completedAt) allCompletions.push(m.completedAt);
        }
        if (m.targetDate && m.status !== 'COMPLETED' && m.targetDate >= now && m.targetDate <= in7) {
          upcoming.push({ planId: p.id, planTitle: p.title, title: m.title, targetDate: m.targetDate });
        }
      }
    }

    upcoming.sort((a, b) => (a.targetDate?.getTime() ?? 0) - (b.targetDate?.getTime() ?? 0));

    return {
      counts: {
        activePlans: plans.filter((p) => p.status === 'ACTIVE').length,
        totalPlans: plans.length,
        totalMilestones,
        completedMilestones,
        completionRate: totalMilestones ? Math.round((completedMilestones / totalMilestones) * 100) : 0,
      },
      streak: this.computeStreak(allCompletions),
      upcoming: upcoming.slice(0, 5),
      nextActions: nextActions.filter((n) => n.nextMilestone).slice(0, 5),
    };
  }

  /** Consecutive-day streak based on milestone completion dates (incl. today/yesterday). */
  private computeStreak(dates: Date[]): number {
    if (!dates.length) return 0;
    const days = new Set(dates.map((d) => d.toISOString().slice(0, 10)));
    let streak = 0;
    const cursor = new Date();
    // Allow the streak to start today or yesterday
    if (!days.has(cursor.toISOString().slice(0, 10))) {
      cursor.setDate(cursor.getDate() - 1);
      if (!days.has(cursor.toISOString().slice(0, 10))) return 0;
    }
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  private async assertOwner(userId: string, planId: string) {
    const plan = await this.prisma.plan.findFirst({ where: { id: planId, userId }, select: { id: true } });
    if (!plan) throw new ForbiddenException('Not your plan');
  }
}
