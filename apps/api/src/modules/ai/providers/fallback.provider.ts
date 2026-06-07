import { Logger } from '@nestjs/common';
import { Observable, catchError } from 'rxjs';
import type { PlanChunk, PlannerInput, PlanJSON } from '@planforge/shared-types';
import { AiProvider } from '../ai.provider.interface';
import { MockProvider } from './mock.provider';

/**
 * Tries a chain of providers in order, falling through to the next on any
 * error (bad key, quota exhausted, network failure, malformed output).
 * A MockProvider is always appended as the final guarantee, so a generation
 * request can never hard-fail. Example chain: gemini → groq → mock.
 */
export class FallbackProvider implements AiProvider {
  readonly name: string;
  private readonly logger = new Logger('AiProvider');
  private readonly chain: AiProvider[];

  constructor(providers: AiProvider[]) {
    const mock = new MockProvider();
    // Ensure mock is the last link
    this.chain = [...providers.filter((p) => p.name !== 'mock'), mock];
    this.name = this.chain.map((p) => p.name).join(' → ');
  }

  generatePlan(input: PlannerInput, systemPrompt: string): Observable<PlanChunk> {
    return this.attempt(0, (p) => p.generatePlan(input, systemPrompt));
  }

  revisePlan(current: PlanJSON, note: string, systemPrompt: string): Observable<PlanChunk> {
    return this.attempt(0, (p) => p.revisePlan(current, note, systemPrompt));
  }

  /** Try provider at index `i`; on error recurse to `i+1`. */
  private attempt(
    i: number,
    call: (p: AiProvider) => Observable<PlanChunk>,
  ): Observable<PlanChunk> {
    const provider = this.chain[i];
    return call(provider).pipe(
      catchError((err) => {
        const next = this.chain[i + 1];
        const reason = (err?.errors ? JSON.stringify(err.errors) : err?.message) ?? String(err);
        this.logger.warn(
          `Provider "${provider.name}" failed${next ? `, trying "${next.name}"` : ''}: ${reason}`,
        );
        if (!next) throw err;
        return this.attempt(i + 1, call);
      }),
    );
  }
}
