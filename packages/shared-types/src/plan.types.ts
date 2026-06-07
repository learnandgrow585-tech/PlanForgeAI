import { z } from 'zod';

/**
 * The canonical 12-section plan schema produced by every AI provider.
 *
 * Real LLMs return natural variations ("planned", "Medium", "Online Course",
 * "85%", string numbers, free-text cadence). Rather than reject those, we
 * preprocess/coerce inputs into the canonical shape so real AI output passes
 * validation reliably. The inferred TypeScript types stay strict.
 */

// ── Coercion helpers ─────────────────────────────────────────
/** Parse the first number found in a value; fall back to 0. */
const looseNumber = (def = 0) =>
  z.preprocess((v) => {
    if (typeof v === 'number') return v;
    const m = String(v ?? '').match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : def;
  }, z.number());

/** Build a forgiving enum: normalises case/spacing and maps synonyms. */
function looseEnum<const T extends readonly [string, ...string[]]>(
  values: T,
  map: (raw: string) => T[number] | undefined,
  fallback: T[number],
): z.ZodType<T[number], z.ZodTypeDef, unknown> {
  const tuple = values as unknown as [string, ...string[]];
  return z.preprocess((v) => {
    const raw = String(v ?? '').trim();
    const upper = raw.toUpperCase().replace(/[\s-]+/g, '_');
    // exact match first
    if ((values as readonly string[]).includes(upper)) return upper;
    return map(upper) ?? fallback;
  }, z.enum(tuple)) as unknown as z.ZodType<T[number], z.ZodTypeDef, unknown>;
}

export const MilestoneStatusEnum = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED',
]);
export type MilestoneStatus = z.infer<typeof MilestoneStatusEnum>;

const milestoneStatus = looseEnum(
  ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'],
  (s) => {
    if (/PLAN|NOT_STARTED|TODO|UPCOMING|FUTURE/.test(s)) return 'PENDING';
    if (/PROGRESS|DOING|ACTIVE|STARTED|ONGOING/.test(s)) return 'IN_PROGRESS';
    if (/COMPLETE|DONE|FINISH/.test(s)) return 'COMPLETED';
    if (/SKIP|CANCEL/.test(s)) return 'SKIPPED';
    return undefined;
  },
  'PENDING',
);

const level = looseEnum(
  ['LOW', 'MEDIUM', 'HIGH'],
  (s) => {
    if (s.startsWith('LOW') || s.startsWith('MINOR')) return 'LOW';
    if (s.startsWith('MED') || s.startsWith('MODER')) return 'MEDIUM';
    if (s.startsWith('HIGH') || s.startsWith('CRIT') || s.startsWith('SEVERE')) return 'HIGH';
    return undefined;
  },
  'MEDIUM',
);

const resourceType = looseEnum(
  ['VIDEO', 'ARTICLE', 'COURSE', 'BOOK', 'TOOL'],
  (s) => {
    if (s.includes('VIDEO') || s.includes('YOUTUBE')) return 'VIDEO';
    if (s.includes('COURSE') || s.includes('CLASS') || s.includes('PLATFORM')) return 'COURSE';
    if (s.includes('BOOK') || s.includes('TEXT')) return 'BOOK';
    if (s.includes('TOOL') || s.includes('APP') || s.includes('SOFTWARE')) return 'TOOL';
    if (s.includes('ARTICLE') || s.includes('BLOG') || s.includes('NOTE') || s.includes('DOC')) return 'ARTICLE';
    return undefined;
  },
  'ARTICLE',
);

const cadence = looseEnum(
  ['DAILY', 'WEEKLY', 'MONTHLY'],
  (s) => {
    if (s.includes('DAIL') || s.includes('DAY')) return 'DAILY';
    if (s.includes('MONTH')) return 'MONTHLY';
    if (s.includes('WEEK')) return 'WEEKLY';
    return undefined;
  },
  'WEEKLY',
);

/** Accept a URL, or coerce anything invalid/empty to undefined. */
const looseUrl = z.preprocess((v) => {
  const s = String(v ?? '').trim();
  return /^https?:\/\//i.test(s) ? s : undefined;
}, z.string().url().optional());

// ── Sub-schemas ──────────────────────────────────────────────
const ActionItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  due: z.string().optional(),
  effortHours: looseNumber().optional(),
});

const MilestoneSchema = z.object({
  title: z.string(),
  description: z.string(),
  targetDate: z.string().optional(),
  order: looseNumber(0),
  status: milestoneStatus.default('PENDING'),
});

const RiskSchema = z.object({
  risk: z.string(),
  likelihood: level,
  impact: level,
  mitigation: z.string(),
});

const LearningResourceSchema = z.object({
  title: z.string(),
  type: resourceType,
  url: looseUrl,
  note: z.string().optional(),
});

// ── The 12 sections ──────────────────────────────────────────
export const PlanJSONSchema = z.object({
  executiveSummary: z.string(),
  currentState: z.object({
    summary: z.string(),
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
  }),
  gapAnalysis: z.object({
    summary: z.string(),
    gaps: z.array(z.string()).default([]),
  }),
  strategy: z.object({
    summary: z.string(),
    pillars: z.array(z.string()).default([]),
  }),
  actionPlan: z.array(ActionItemSchema).default([]),
  milestones: z.array(MilestoneSchema).default([]),
  timeline: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    phases: z
      .array(
        z.object({
          label: z.string(),
          startWeek: looseNumber(0),
          endWeek: looseNumber(0),
          focus: z.string(),
        }),
      )
      .default([]),
  }),
  learningResources: z.array(LearningResourceSchema).default([]),
  riskAssessment: z.array(RiskSchema).default([]),
  progressTracking: z.object({
    metrics: z
      .array(
        z.object({
          name: z.string(),
          unit: z.string(),
          target: looseNumber(0),
        }),
      )
      .default([]),
    cadence: cadence.default('WEEKLY'),
  }),
  successProbability: z.object({
    score: z.preprocess((v) => {
      const m = String(v ?? '').match(/-?\d+(\.\d+)?/);
      const n = typeof v === 'number' ? v : m ? Number(m[0]) : 0;
      return Math.max(0, Math.min(100, n));
    }, z.number().min(0).max(100)),
    rationale: z.string(),
  }),
  recommendations: z.array(z.string()).default([]),
});

export type PlanJSON = z.infer<typeof PlanJSONSchema>;

/** Input passed to a provider to generate a plan. */
export const PlannerInputSchema = z.object({
  goal: z.string(),
  constraints: z.array(z.string()).default([]),
  timeline: z.string().optional(),
  budget: z.string().optional(),
  resources: z.array(z.string()).default([]),
  userProfile: z.record(z.unknown()).default({}),
  formData: z.record(z.unknown()).default({}),
});
export type PlannerInput = z.infer<typeof PlannerInputSchema>;

/** A streamed chunk while a plan is being generated. */
export interface PlanChunk {
  type: 'progress' | 'section' | 'done' | 'error';
  sectionIndex?: number;
  sectionName?: keyof PlanJSON;
  message?: string;
  plan?: PlanJSON;
}
