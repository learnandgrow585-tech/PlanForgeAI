import { Observable } from 'rxjs';
import type { PlanChunk, PlannerInput, PlanJSON } from '@planforge/shared-types';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

/**
 * Every provider (mock, gemini, groq, ollama) implements this one interface.
 * Switching providers is a single env var (AI_PROVIDER) — no business logic
 * changes anywhere else in the app.
 */
export interface AiProvider {
  readonly name: string;

  /** Stream a freshly generated plan, section by section. */
  generatePlan(input: PlannerInput, systemPrompt: string): Observable<PlanChunk>;

  /** Stream a revised plan given the current plan and a free-text note. */
  revisePlan(
    current: PlanJSON,
    note: string,
    systemPrompt: string,
  ): Observable<PlanChunk>;
}
