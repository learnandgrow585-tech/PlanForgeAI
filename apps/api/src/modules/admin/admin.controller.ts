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
import { z } from 'zod';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ZodBody } from '../../common/zod-validation.pipe';

const InputFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(['text', 'textarea', 'number', 'select', 'multi-select', 'range', 'date']),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  helpText: z.string().optional(),
});

const InputSchema = z.object({
  preferredModelTier: z.enum(['flash', 'pro']).optional(),
  inputFields: z.array(InputFieldSchema).min(1),
  knowledgeHubConfig: z
    .object({ enabled: z.boolean(), keywords: z.array(z.string()) })
    .optional(),
});

const PlannerCreateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and dashes only'),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
  inputSchema: InputSchema,
  systemPromptTemplate: z.string().min(10),
});
const PlannerUpdateSchema = PlannerCreateSchema.partial();

const RoleSchema = z.object({ role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']) });
const ActiveSchema = z.object({ isActive: z.boolean() });

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('audit')
  audit() {
    return this.admin.listAudit();
  }

  // ── Users ──
  @Get('users')
  users() {
    return this.admin.listUsers();
  }

  @Patch('users/:id/active')
  setActive(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body(new ZodBody(ActiveSchema)) body: z.infer<typeof ActiveSchema>,
  ) {
    return this.admin.setUserActive(me.sub, id, body.isActive);
  }

  @Patch('users/:id/role')
  setRole(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body(new ZodBody(RoleSchema)) body: z.infer<typeof RoleSchema>,
  ) {
    return this.admin.setUserRole(me.sub, id, body.role);
  }

  @Delete('users/:id')
  deleteUser(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.admin.deleteUser(me.sub, id);
  }

  // ── Planners ──
  @Get('planners')
  planners() {
    return this.admin.listPlanners();
  }

  @Post('planners')
  createPlanner(
    @CurrentUser() me: AuthUser,
    @Body(new ZodBody(PlannerCreateSchema)) body: z.infer<typeof PlannerCreateSchema>,
  ) {
    return this.admin.createPlanner(me.sub, body);
  }

  @Patch('planners/:id')
  updatePlanner(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body(new ZodBody(PlannerUpdateSchema)) body: z.infer<typeof PlannerUpdateSchema>,
  ) {
    return this.admin.updatePlanner(me.sub, id, body);
  }

  @Delete('planners/:id')
  deletePlanner(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.admin.deletePlanner(me.sub, id);
  }
}
