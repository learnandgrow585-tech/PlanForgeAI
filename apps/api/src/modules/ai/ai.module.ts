import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AI_PROVIDER, AiProvider } from './ai.provider.interface';
import { MockProvider } from './providers/mock.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { FallbackProvider } from './providers/fallback.provider';

/**
 * Dynamic provider selection via the AI_PROVIDER env var. The chosen provider
 * is the head of a fallback chain that always ends in the mock provider, and
 * includes Groq as a real-AI fallback when a GROQ_API_KEY is present.
 * e.g. AI_PROVIDER=gemini  ->  gemini → groq → mock
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: AI_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): AiProvider => {
        const provider = config.get<string>('AI_PROVIDER', 'mock');
        const logger = new Logger('AiModule');

        const geminiKey = config.get<string>('GEMINI_API_KEY', '');
        const groqKey = config.get<string>('GROQ_API_KEY', '');

        const makeGemini = () =>
          new GeminiProvider(
            geminiKey,
            config.get<string>('GEMINI_FLASH_MODEL', 'gemini-2.5-flash'),
            config.get<string>('GEMINI_PRO_MODEL', 'gemini-2.5-flash'),
          );
        const makeGroq = () =>
          new GroqProvider(groqKey, config.get<string>('GROQ_MODEL', 'llama-3.3-70b-versatile'));
        const makeOllama = () =>
          new OllamaProvider(
            config.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434'),
            config.get<string>('OLLAMA_MODEL', 'llama3.1'),
          );

        try {
          let instance: AiProvider;
          switch (provider) {
            case 'gemini': {
              const chain: AiProvider[] = [makeGemini()];
              if (groqKey) chain.push(makeGroq()); // real-AI fallback before mock
              instance = new FallbackProvider(chain);
              break;
            }
            case 'groq':
              instance = new FallbackProvider([makeGroq()]);
              break;
            case 'ollama':
              instance = new FallbackProvider([makeOllama()]);
              break;
            case 'mock':
            default:
              instance = new MockProvider();
          }
          logger.log(`AI provider chain: ${instance.name}`);
          return instance;
        } catch (err) {
          logger.warn(
            `Failed to init "${provider}" provider (${(err as Error).message}). Falling back to mock.`,
          );
          return new MockProvider();
        }
      },
    },
  ],
  exports: [AI_PROVIDER],
})
export class AiModule {}
