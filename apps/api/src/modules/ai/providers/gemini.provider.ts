import { Observable } from 'rxjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { PlanChunk, PlannerInput, PlanJSON } from '@planforge/shared-types';
import { AiProvider } from '../ai.provider.interface';
import { JSON_INSTRUCTION, parsePlan, withRetry } from '../llm-utils';

/**
 * Gemini provider. Model names are env-configurable because Google rotates
 * them — the original 1.5 models were retired, so we default to the current
 * free-tier 2.0 family. Override with GEMINI_FLASH_MODEL / GEMINI_PRO_MODEL.
 * 1M free tokens/day, no credit card.
 */
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  private readonly client: GoogleGenerativeAI;

  constructor(
    apiKey: string,
    private readonly flashModel = 'gemini-2.0-flash',
    private readonly proModel = 'gemini-2.0-flash',
  ) {
    if (!apiKey) throw new Error('GEMINI_API_KEY is required for the gemini provider');
    this.client = new GoogleGenerativeAI(apiKey);
  }

  private modelFor(tier: 'flash' | 'pro') {
    return this.client.getGenerativeModel({
      model: tier === 'pro' ? this.proModel : this.flashModel,
      generationConfig: { responseMimeType: 'application/json' },
    });
  }

  generatePlan(input: PlannerInput, systemPrompt: string): Observable<PlanChunk> {
    const tier = (input.userProfile?.preferredModelTier as 'flash' | 'pro') ?? 'flash';
    const prompt = `${systemPrompt}\n\nUser input:\n${JSON.stringify(
      { goal: input.goal, form: input.formData, constraints: input.constraints },
      null,
      2,
    )}\n\n${JSON_INSTRUCTION}`;
    return this.run(tier, prompt);
  }

  revisePlan(current: PlanJSON, note: string, systemPrompt: string): Observable<PlanChunk> {
    const prompt = `${systemPrompt}\n\nCurrent plan:\n${JSON.stringify(current)}\n\nRevision requested: "${note}"\n\nReturn the FULL updated plan.\n\n${JSON_INSTRUCTION}`;
    return this.run('pro', prompt);
  }

  private run(tier: 'flash' | 'pro', prompt: string): Observable<PlanChunk> {
    return new Observable<PlanChunk>((sub) => {
      sub.next({ type: 'progress', message: 'Contacting Gemini…' });
      withRetry(async () => {
        const stream = await this.modelFor(tier).generateContentStream(prompt);
        let text = '';
        for await (const chunk of stream.stream) {
          text += chunk.text();
          sub.next({ type: 'progress', message: 'Generating…' });
        }
        return parsePlan(text);
      })
        .then((plan) => {
          sub.next({ type: 'done', plan });
          sub.complete();
        })
        .catch((err) => sub.error(err));
    });
  }
}
