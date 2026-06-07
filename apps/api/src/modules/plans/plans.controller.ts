import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { z } from 'zod';
import { PlanningEngineService } from '../planning-engine/planning-engine.service';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ZodBody } from '../../common/zod-validation.pipe';

const GenerateSchema = z.object({
  plannerSlug: z.string().optional(),
  plannerId: z.string().optional(),
  title: z.string().optional(),
  goal: z.string().optional(),
  formData: z.record(z.unknown()).default({}),
});
const ReviseSchema = z.object({ note: z.string().min(1) });
const AddMilestoneSchema = z.object({ title: z.string().min(1), description: z.string().optional() });
const ReorderSchema = z.object({ direction: z.enum(['up', 'down']) });

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(
    private readonly engine: PlanningEngineService,
    private readonly plans: PlansService,
  ) {}

  /** Dashboard summary — must be declared before ':id' to avoid route capture. */
  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.plans.dashboardSummary(user.sub);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.plans.listForUser(user.sub);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.plans.getForUser(user.sub, id);
  }

  /** Kick off generation; returns the new plan id immediately (async generation). */
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodBody(GenerateSchema)) body: z.infer<typeof GenerateSchema>,
  ) {
    const slug = body.plannerSlug ?? body.plannerId;
    if (!slug) return { error: 'plannerSlug or plannerId required' };
    const formData = { ...(body.formData ?? {}), ...(body.goal ? { goal: body.goal } : {}) };
    const { planId } = await this.engine.generateBySlugOrId(user.sub, slug, formData);
    return { id: planId };
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.plans.deleteForUser(user.sub, id);
  }

  /** Retry a stuck/failed generation using the plan's saved inputs. */
  @Post(':id/retry')
  retry(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.engine.retry(user.sub, id);
  }

  // ── Milestone management ───────────────────────────────────
  @Post(':id/milestones')
  addMilestone(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodBody(AddMilestoneSchema)) body: z.infer<typeof AddMilestoneSchema>,
  ) {
    return this.plans.addMilestone(user.sub, id, body.title, body.description);
  }

  @Patch(':id/milestones/:milestoneId/complete')
  completeMilestone(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.plans.toggleMilestone(user.sub, id, milestoneId);
  }

  @Patch(':id/milestones/:milestoneId/reorder')
  reorderMilestone(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Body(new ZodBody(ReorderSchema)) body: z.infer<typeof ReorderSchema>,
  ) {
    return this.plans.reorderMilestone(user.sub, id, milestoneId, body.direction);
  }

  @Delete(':id/milestones/:milestoneId')
  deleteMilestone(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.plans.deleteMilestone(user.sub, id, milestoneId);
  }

  // ── Conversational revision ────────────────────────────────
  @Post(':id/revise')
  async revise(
    @CurrentUser() _user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodBody(ReviseSchema)) body: z.infer<typeof ReviseSchema>,
  ) {
    const stream = await this.engine.revise(id, body.note);
    return lastValueFrom(stream);
  }
}
