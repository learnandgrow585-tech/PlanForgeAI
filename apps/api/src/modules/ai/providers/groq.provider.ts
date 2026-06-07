import { Observable } from 'rxjs';
import Groq from 'groq-sdk';
import type { PlanChunk, PlannerInput, PlanJSON } from '@planforge/shared-types';
import { AiProvider } from '../ai.provider.interface';
import { JSON_INSTRUCTION, parsePlan, withRetry } from '../llm-utils';

/**
 * Groq provider — llama-3.1-70b-versatile. 6,000 free req/day, 300+ tok/s.
 * Best fallback / fastest streaming demo.
 */
export class GroqProvider implements AiProvider {
  readonly name = 'groq';
  private readonly client: Groq;

  constructor(
    apiKey: string,
    private readonly model = 'llama-3.3-70b-versatile',
  ) {
    if (!apiKey) throw new Error('GROQ_API_KEY is required for the groq provider');
    this.client = new Groq({ apiKey });
  }

  generatePlan(input: PlannerInput, systemPrompt: string): Observable<PlanChunk> {
    const user = `User input:\n${JSON.stringify(
      { goal: input.goal, form: input.formData, constraints: input.constraints },
      null,
      2,
    )}`;
    return this.run(systemPrompt, user);
  }

  revisePlan(current: PlanJSON, note: string, systemPrompt: string): Observable<PlanChunk> {
    return this.run(systemPrompt, `Current plan:\n${JSON.stringify(current)}\n\nRevision: "${note}"`);
  }

  private run(systemPrompt: string, user: string): Observable<PlanChunk> {
    return new Observable<PlanChunk>((sub) => {
      sub.next({ type: 'progress', message: 'Contacting Groq…' });
      withRetry(async () => {
        const res = await this.client.chat.completions.create({
          model: this.model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: `${systemPrompt}\n\n${JSON_INSTRUCTION}` },
            { role: 'user', content: user },
          ],
        });
        return parsePlan(res.choices[0]?.message?.content ?? '');
      })
        .then((plan) => {
          sub.next({ type: 'done', plan });
          sub.complete();
        })
        .catch((err) => sub.error(err));
    });
  }
}
