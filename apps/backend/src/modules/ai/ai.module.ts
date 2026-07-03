import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OllamaProvider } from './ollama.provider';
import { PromptBuilderService } from './prompt-builder.service';
import { InsightParserService } from './insight-parser.service';
import { LLM_PROVIDER } from './interfaces/llm-provider.interface';

/**
 * AiModule -- isolates all LLM-related infrastructure.
 *
 * OllamaProvider is registered behind the LLM_PROVIDER injection token
 * so no service outside this module ever imports the concrete class.
 * Consumers inject ILlmProvider via @Inject(LLM_PROVIDER).
 *
 * Exports:
 *   LLM_PROVIDER      -- resolves to OllamaProvider (swappable in tests / future)
 *   PromptBuilderService -- pure ContextPack -> prompt transformer
 *   InsightParserService -- pure JSON string -> ParsedInsightSet validator
 *
 * No module outside InsightsModule should import AiModule directly.
 * The LLM layer is accessed exclusively through InsightsService.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    { provide: LLM_PROVIDER, useClass: OllamaProvider },
    PromptBuilderService,
    InsightParserService,
  ],
  exports: [
    LLM_PROVIDER,
    PromptBuilderService,
    InsightParserService,
  ],
})
export class AiModule {}
