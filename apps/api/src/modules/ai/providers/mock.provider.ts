import { Observable, of } from 'rxjs';
import type { PlanChunk, PlannerInput, PlanJSON } from '@planforge/shared-types';
import { PlanJSONSchema } from '@planforge/shared-types';
import { AiProvider } from '../ai.provider.interface';
import { buildMockPlan } from '../mock-plan';

/**
 * Option C — returns a realistic hardcoded plan immediately. Zero API calls,
 * zero cost. Use for all UI development, feature testing and CI.
 */
export class MockProvider implements AiProvider {
  readonly name = 'mock';

  generatePlan(input: PlannerInput, _systemPrompt?: string): Observable<PlanChunk> {
    const plan = PlanJSONSchema.parse(buildMockPlan(input));
    return of({ type: 'done', plan } as PlanChunk);
  }

  revisePlan(current: PlanJSON, note: string, _systemPrompt?: string): Observable<PlanChunk> {
    // Validate the incoming plan — if it's incomplete (e.g. stored as {} during
    // a previous draft), fall back to a fresh mock plan so revision never crashes.
    const safeParse = PlanJSONSchema.safeParse(current);
    const base = safeParse.success
      ? safeParse.data
      : buildMockPlan({ goal: 'Revised plan', constraints: [], resources: [], userProfile: {}, formData: {} });

    const revised: PlanJSON = {
      ...base,
      executiveSummary: `${base.executiveSummary}\n\n📝 Revision note: "${note}"`,
      recommendations: [
        `Based on your update ("${note}"), re-prioritise your nearest milestone.`,
        ...base.recommendations.slice(0, 2),
      ],
    };
    return of({ type: 'done', plan: PlanJSONSchema.parse(revised) } as PlanChunk);
  }
}
