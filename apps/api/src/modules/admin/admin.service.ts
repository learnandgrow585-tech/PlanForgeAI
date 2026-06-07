import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PlannerUpsert {
  slug: string;
  name: string;
  category: string;
  description: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
  inputSchema: unknown;
  systemPromptTemplate: string;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Audit ─────────────────────────────────────────────────
  private audit(actorId: string, action: string, target?: string, metadata?: object) {
    return this.prisma.auditLog.create({
      data: { actorId, action, target, metadata: metadata ?? undefined },
    });
  }

  listAudit() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { actor: { select: { email: true } } },
    });
  }

  // ── Stats ─────────────────────────────────────────────────
  async stats() {
    const [users, plans, planners, byPlanner, byStatus, recentUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.plan.count(),
      this.prisma.planner.count({ where: { isActive: true } }),
      this.prisma.plan.groupBy({ by: ['plannerId'], _count: { _all: true } }),
      this.prisma.plan.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
    ]);

    // Resolve planner names for the usage breakdown
    const plannerMap = new Map(
      (await this.prisma.planner.findMany({ select: { id: true, name: true } })).map((p) => [p.id, p.name]),
    );

    return {
      totals: { users, plans, activePlanners: planners, newUsers7d: recentUsers },
      plansByPlanner: byPlanner
        .map((b) => ({ planner: plannerMap.get(b.plannerId) ?? b.plannerId, count: b._count._all }))
        .sort((a, b) => b.count - a.count),
      plansByStatus: byStatus.map((b) => ({ status: b.status, count: b._count._all })),
    };
  }

  // ── Users ─────────────────────────────────────────────────
  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { plans: true } } },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      subscriptionTier: u.subscriptionTier,
      isActive: u.isActive,
      planCount: u._count.plans,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }));
  }

  async setUserActive(actorId: string, userId: string, isActive: boolean) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { isActive } });
    await this.audit(actorId, isActive ? 'USER_RESTORE' : 'USER_SUSPEND', userId);
    return { id: user.id, isActive: user.isActive };
  }

  async setUserRole(actorId: string, userId: string, role: 'USER' | 'ADMIN' | 'SUPER_ADMIN') {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { role } });
    await this.audit(actorId, 'USER_ROLE_CHANGE', userId, { role });
    return { id: user.id, role: user.role };
  }

  async deleteUser(actorId: string, userId: string) {
    if (actorId === userId) throw new ConflictException('You cannot delete your own account');
    await this.prisma.user.delete({ where: { id: userId } });
    await this.audit(actorId, 'USER_DELETE', userId);
    return { deleted: true };
  }

  // ── Planners ──────────────────────────────────────────────
  listPlanners() {
    return this.prisma.planner.findMany({ orderBy: { order: 'asc' } });
  }

  async createPlanner(actorId: string, data: PlannerUpsert) {
    const existing = await this.prisma.planner.findUnique({ where: { slug: data.slug } });
    if (existing) throw new ConflictException('A planner with this slug already exists');
    const planner = await this.prisma.planner.create({
      data: {
        slug: data.slug,
        name: data.name,
        category: data.category as never,
        description: data.description,
        icon: data.icon ?? 'Sparkles',
        order: data.order ?? 0,
        isActive: data.isActive ?? true,
        inputSchema: data.inputSchema as object,
        systemPromptTemplate: data.systemPromptTemplate,
      },
    });
    await this.audit(actorId, 'PLANNER_CREATE', planner.id, { slug: planner.slug });
    return planner;
  }

  async updatePlanner(actorId: string, id: string, data: Partial<PlannerUpsert>) {
    const exists = await this.prisma.planner.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Planner not found');
    const planner = await this.prisma.planner.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category as never,
        description: data.description,
        icon: data.icon,
        order: data.order,
        isActive: data.isActive,
        inputSchema: data.inputSchema as object,
        systemPromptTemplate: data.systemPromptTemplate,
      },
    });
    await this.audit(actorId, 'PLANNER_UPDATE', id, { slug: planner.slug });
    return planner;
  }

  async deletePlanner(actorId: string, id: string) {
    const planner = await this.prisma.planner.findUnique({ where: { id }, include: { _count: { select: { plans: true } } } });
    if (!planner) throw new NotFoundException('Planner not found');
    if (planner._count.plans > 0) {
      // Don't orphan plans — soft-disable instead of deleting
      await this.prisma.planner.update({ where: { id }, data: { isActive: false } });
      await this.audit(actorId, 'PLANNER_DISABLE', id, { reason: 'has plans' });
      return { disabled: true, reason: 'Planner has existing plans, so it was disabled instead of deleted.' };
    }
    await this.prisma.planner.delete({ where: { id } });
    await this.audit(actorId, 'PLANNER_DELETE', id);
    return { deleted: true };
  }
}
