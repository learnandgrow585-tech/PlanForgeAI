import { describe, it, expect } from 'vitest';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { PlanJSONSchema, type PlannerInput } from '@planforge/shared-types';
import { MockProvider } from './providers/mock.provider';
import { extractJson, parsePlan } from './llm-utils';
import { buildMockPlan } from './mock-plan';

const input: PlannerInput = {
  goal: 'Run a marathon',
  constraints: [],
  resources: [],
  userProfile: {},
  formData: {},
};

describe('MockProvider', () => {
  it('returns a valid 12-section plan', async () => {
    const provider = new MockProvider();
    const chunk = await firstValueFrom(provider.generatePlan(input, 'system'));
    expect(chunk.type).toBe('done');
    expect(() => PlanJSONSchema.parse(chunk.plan)).not.toThrow();
  });

  it('revises the executive summary', async () => {
    const provider = new MockProvider();
    const base = PlanJSONSchema.parse(buildMockPlan(input));
    const chunk = await lastValueFrom(provider.revisePlan(base, 'delayed 2 months', 'system'));
    // The revision note should be reflected back into the plan
    expect(chunk.plan?.executiveSummary).toContain('delayed 2 months');
  });
});

describe('llm-utils', () => {
  it('extracts JSON from fenced model output', () => {
    const out = '```json\n{"a":1}\n```';
    expect(extractJson(out)).toEqual({ a: 1 });
  });

  it('parses a full plan from text', () => {
    const text = JSON.stringify(buildMockPlan(input));
    expect(() => parsePlan(text)).not.toThrow();
  });
});
