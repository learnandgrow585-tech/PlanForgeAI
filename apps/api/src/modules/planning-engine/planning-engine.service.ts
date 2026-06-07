import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Observable, lastValueFrom, tap } from 'rxjs';
import { createHash } from 'node:crypto';
import type { PlanChunk, PlannerInput, PlanJSON } from '@planforge/shared-types';
import { AI_PROVIDER, AiProvider } from '../ai/ai.provider.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { EmailService } from '../../email/email.service';

/**
 * The Universal Planning Engine. Loads a planner config, builds the prompt,
 * delegates to the active AI provider, validates + persists the plan and its
 * milestones. Generation runs in the background so the API responds instantly
 * and the UI can poll for progress. Identical requests are served from cache
 * to preserve AI quota.
 */
@Injectable()
export class PlanningEngineService {
  constructor(
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly email: EmailService,
  ) {}

  async generateBySlugOrId(
    userId: string,
    slugOrId: string,
    formData: Record<string, unknown>,
  ): Promise<{ planId: string }> {
    const planner =
      slugOrId.length > 20
        ? await this.prisma.planner.findFirst({ where: { OR: [{ id: slugOrId }, { slug: slugOrId }] } })
        : await this.prisma.planner.findUnique({ where: { slug: slugOrId } });
    if (!planner || !planner.isActive) throw new NotFoundException('Planner not found');
    return this.startGeneration(userId, planner, formData);
  }

  private async startGeneration(
    userId: string,
    planner: { id: string; name: string; slug: string; systemPromptTemplate: string; inputSchema: unknown },
    formData: Record<string, unknown>,
  ): Promise<{ planId: string }> {
    const schema = planner.inputSchema as Record<string, unknown>;
    const input: PlannerInput = {
      goal: String(formData.goal ?? planner.name),
      constraints: [],
      resources: [],
      userProfile: { preferredModelTier: schema.preferredModelTier ?? 'flash' },
      formData,
    };

    const goalText = String(formData.goal ?? '').trim();
    const titleBase =
      goalText && goalText.toLowerCase() !== planner.name.toLowerCase()
        ? goalText
        : `My ${planner.name}`;

    const plan = await this.prisma.plan.create({
      data: {
        userId,
        plannerId: planner.id,
        title: titleBase.slice(0, 100),
        status: 'DRAFT', // DRAFT === "generating" until populated
        planData: {},
        inputData: formData as object,
      },
    });

    this.runGeneration(plan.id, planner.slug, userId, plan.title, input, planner.systemPromptTemplate, formData);
    return { planId: plan.id };
  }

  /** Retry generation for an existing (stuck/failed) plan using its stored inputs. */
  async retry(userId: string, planId: string): Promise<{ planId: string }> {
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, userId },
      include: { planner: true },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.inputData) throw new NotFoundException('This plan has no saved inputs to retry');

    const formData = plan.inputData as Record<string, unknown>;
    const schema = plan.planner.inputSchema as Record<string, unknown>;
    const input: PlannerInput = {
      goal: String(formData.goal ?? plan.planner.name),
      constraints: [],
      resources: [],
      userProfile: { preferredModelTier: schema.preferredModelTier ?? 'flash' },
      formData,
    };
    // Touch updatedAt so the UI knows generation is active again
    await this.prisma.plan.update({ where: { id: planId }, data: { status: 'DRAFT', updatedAt: new Date() } });
    this.runGeneration(planId, plan.planner.slug, userId, plan.title, input, plan.planner.systemPromptTemplate, formData);
    return { planId };
  }

  /** Shared background-generation routine (cache check + AI + persist). */
  private runGeneration(
    planId: string,
    plannerSlug: string,
    userId: string,
    title: string,
    input: PlannerInput,
    systemPrompt: string,
    formData: Record<string, unknown>,
  ) {
    const cacheKey = `plan:${plannerSlug}:${this.hash(formData)}`;

    void (async () => {
      const cached = await this.cache.get<PlanJSON>(cacheKey);
      if (cached) {
        await this.persist(planId, cached);
        void this.notifyReady(userId, planId, title);
        return;
      }
      try {
        const chunk = await lastValueFrom(this.ai.generatePlan(input, systemPrompt));
        if (chunk?.type === 'done' && chunk.plan) {
          await this.persist(planId, chunk.plan);
          await this.cache.set(cacheKey, chunk.plan, 86_400); // 24h
          void this.notifyReady(userId, planId, title);
        }
      } catch {
        // Provider chain ends in mock so this is unlikely; leave DRAFT for retry.
      }
    })();
  }

  private async notifyReady(userId: string, planId: string, title: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user?.email) await this.email.sendPlanReady(user.email, title, planId);
  }

  private hash(obj: unknown): string {
    return createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
  }

  /** Persist a finished plan and materialise its milestones. */
  private async persist(planId: string, plan: PlanJSON) {
    await this.prisma.plan.update({
      where: { id: planId },
      data: { planData: plan as object, status: 'ACTIVE' },
    });
    await this.prisma.milestone.deleteMany({ where: { planId } });
    if (plan.milestones.length) {
      await this.prisma.milestone.createMany({
        data: plan.milestones.map((m, i) => ({
          planId,
          title: m.title,
          description: m.description,
          order: m.order ?? i,
          status: m.status,
          targetDate: m.targetDate ? this.safeDate(m.targetDate) : null,
        })),
      });
    }
  }

  private safeDate(s: string): Date | null {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  /** Conversational revision: re-run with the current plan + a note. */
  async revise(planId: string, note: string): Promise<Observable<PlanChunk>> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: { planner: true },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    const current = plan.planData as unknown as PlanJSON;
    return this.ai.revisePlan(current, note, plan.planner.systemPromptTemplate).pipe(
      tap(async (chunk) => {
        if (chunk.type === 'done' && chunk.plan) {
          await this.prisma.planRevision.create({
            data: {
              planId,
              note,
              previousData: current as object,
              newData: chunk.plan as object,
              version: plan.version,
            },
          });
          await this.prisma.plan.update({
            where: { id: planId },
            data: { planData: chunk.plan as object, version: { increment: 1 } },
          });
          await this.persist(planId, chunk.plan);
        }
      }),
    );
  }
}
