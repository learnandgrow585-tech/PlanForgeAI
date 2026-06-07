import { Observable } from 'rxjs';
import { Ollama } from 'ollama';
import type { PlanChunk, PlannerInput, PlanJSON } from '@planforge/shared-types';
import { AiProvider } from '../ai.provider.interface';
import { JSON_INSTRUCTION, parsePlan, withRetry } from '../llm-utils';

/**
 * Ollama provider — runs Llama 3.1 / Mistral locally. Offline, unlimited, free.
 * Great for testing prompts without burning Gemini/Groq quota.
 */
export class OllamaProvider implements AiProvider {
  readonly name = 'ollama';
  private readonly client: Ollama;

  constructor(
    baseUrl: string,
    private readonly model: string,
  ) {
    this.client = new Ollama({ host: baseUrl });
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
      sub.next({ type: 'progress', message: 'Contacting Ollama…' });
      withRetry(async () => {
        const res = await this.client.chat({
          model: this.model,
          format: 'json',
          stream: false,
          messages: [
            { role: 'system', content: `${systemPrompt}\n\n${JSON_INSTRUCTION}` },
            { role: 'user', content: user },
          ],
        });
        return parsePlan(res.message.content);
      })
        .then((plan) => {
          sub.next({ type: 'done', plan });
          sub.complete();
        })
        .catch((err) => sub.error(err));
    });
  }
}
