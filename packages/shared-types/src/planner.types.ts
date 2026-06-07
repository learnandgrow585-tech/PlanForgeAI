import { z } from 'zod';

/** The 14 planner categories the marketplace supports. */
export const PlannerCategoryEnum = z.enum([
  'WEALTH',
  'GOAL',
  'CAREER',
  'FITNESS',
  'STARTUP',
  'RETIREMENT',
  'EDUCATION',
  'VEHICLE',
  'HOUSE_CONSTRUCTION',
  'ENGINEERING',
  'TRAVEL',
  'RELATIONSHIP',
  'PRODUCTIVITY',
  'OTHER',
]);
export type PlannerCategory = z.infer<typeof PlannerCategoryEnum>;

/** A single field in a dynamic planner form. */
export const InputFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum([
    'text',
    'textarea',
    'number',
    'select',
    'multi-select',
    'range',
    'date',
  ]),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  helpText: z.string().optional(),
});
export type InputField = z.infer<typeof InputFieldSchema>;

/**
 * A full planner definition. Stored as JSON in the DB so new planners can be
 * added with a seed + prompt template — zero code changes (the marketplace).
 */
export const PlannerConfigSchema = z.object({
  id: z.string().optional(),
  slug: z.string(),
  name: z.string(),
  category: PlannerCategoryEnum,
  description: z.string(),
  icon: z.string().default('Sparkles'),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
  inputFields: z.array(InputFieldSchema),
  systemPromptTemplate: z.string(),
  /** Which of the 12 sections to emphasise for this planner. */
  outputSections: z.array(z.string()).default([]),
  /** Hint to the engine which model tier to use. */
  preferredModelTier: z.enum(['flash', 'pro']).default('flash'),
  knowledgeHubConfig: z
    .object({
      enabled: z.boolean().default(true),
      keywords: z.array(z.string()).default([]),
    })
    .default({ enabled: true, keywords: [] }),
});
export type PlannerConfig = z.infer<typeof PlannerConfigSchema>;
