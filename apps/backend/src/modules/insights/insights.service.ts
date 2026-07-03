import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { FactsService } from '../facts/facts.service';
import { LLM_PROVIDER, ILlmProvider } from '../ai/interfaces/llm-provider.interface';
import { PromptBuilderService } from '../ai/prompt-builder.service';
import { InsightParserService, InsightParseException } from '../ai/insight-parser.service';
import { InsightsRepository } from './insights.repository';
import type { ValidatedInsight } from '../ai/types/ai.types';
import type { InsightResponseDto, TalkingPointResponseDto, PaginatedInsightsResponseDto } from './dto/insight-response.dto';
import type { InsightRecord, TalkingPointRecord, ListInsightsOptions } from './types/insights.types';

/**
 * InsightsService -- orchestrates AI-powered coaching insight generation.
 *
 * Depends on ILlmProvider (via LLM_PROVIDER token), not on OllamaProvider
 * directly. This keeps the LLM runtime swappable without touching this service.
 *
 * Flow per generate() call:
 *   1. Assert developer exists (via KnowledgeService.buildContextPack).
 *   2. Ensure Facts are current: call FactsService.generate() for the period.
 *   3. Build the ContextPack via KnowledgeService.buildContextPack().
 *   4. Build system + user prompts via PromptBuilderService.
 *   5. Call the LLM via ILlmProvider.chat().
 *   6. Parse and validate structure via InsightParserService.
 *   7. Validate factIds against the ContextPack (ADR-008 rules 3 and 4):
 *        - validFactIds:   exist in pack.facts -> persisted
 *        - unknownFactIds: not found -> logged as warning, never persisted
 *        - If validFactIds.length === 0 -> discard entire insight + warn
 *   8. Persist surviving insights via InsightsRepository (atomic $transaction).
 *
 * Does NOT implement the BullMQ job -- that is Day 7 / Phase 5.
 * The HTTP endpoint is synchronous for local validation.
 */
@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly factsService: FactsService,
    @Inject(LLM_PROVIDER) private readonly llmProvider: ILlmProvider,
    private readonly promptBuilder: PromptBuilderService,
    private readonly insightParser: InsightParserService,
    private readonly insightsRepository: InsightsRepository,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Generate, validate, and persist coaching insights for a developer period.
   *
   * The operation is idempotent-safe in the sense that each call inserts new
   * Insight rows (generation is not deduplicated). Callers should not call
   * this for the same period repeatedly without purpose.
   */
  async generate(
    developerId: string,
    teamLeadId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<InsightResponseDto[]> {
    this.logger.log(
      `Generating insights for developer=${developerId} ` +
      `period=[${periodStart.toISOString()} to ${periodEnd.toISOString()}]`,
    );

    // Step 1+2: ensure facts are current for the period
    await this.factsService.generate(developerId, teamLeadId, periodStart, periodEnd);

    // Step 3: build context pack (this also validates the developer exists)
    const pack = await this.knowledgeService.buildContextPack(
      developerId,
      teamLeadId,
      periodStart,
      periodEnd,
    );

    // Known fact IDs in this context pack (used for factId validation)
    const knownFactIds = new Set(pack.facts.map((f) => f.id));

    if (knownFactIds.size === 0) {
      throw new UnprocessableEntityException(
        `No facts found for developer ${developerId} in the requested period. ` +
        'Run POST /facts/generate first.',
      );
    }

    // Step 4: build prompts
    const systemPrompt = this.promptBuilder.buildSystemPrompt();
    const userPrompt   = this.promptBuilder.buildUserPrompt(pack);

    // Step 5: call the LLM provider (concrete implementation is resolved via DI)
    const raw = await this.llmProvider.chat(systemPrompt, userPrompt);

    // Step 6: parse and validate structure
    // InsightParseException means the LLM returned malformed JSON or an invalid
    // structure -- this is a recoverable client-facing error (retry generation),
    // not an internal server error. Map to 422 so the frontend can surface a
    // meaningful message instead of a generic 500.
    let parsedSet: ReturnType<typeof this.insightParser.parse>;
    try {
      parsedSet = this.insightParser.parse(raw);
    } catch (err) {
      if (err instanceof InsightParseException) {
        throw new UnprocessableEntityException(
          `The AI returned an invalid response and could not be parsed. ` +
          `Try generating again. Detail: ${err.message}`,
        );
      }
      throw err;
    }

    // Step 7: validate factIds per ADR-008 rules 3 and 4
    const validatedInsights: ValidatedInsight[] = [];

    for (const parsed of parsedSet.insights) {
      const validFactIds:   string[] = [];
      const unknownFactIds: string[] = [];

      for (const id of parsed.factIds) {
        if (knownFactIds.has(id)) {
          validFactIds.push(id);
        } else {
          unknownFactIds.push(id);
        }
      }

      if (unknownFactIds.length > 0) {
        this.logger.warn(
          `Insight type=${parsed.type} references unknown factId(s): [${unknownFactIds.join(', ')}]. ` +
          'These will not be persisted.',
        );
      }

      if (validFactIds.length === 0) {
        this.logger.warn(
          `Insight type=${parsed.type} has no valid factIds after validation -- discarding. ` +
          `Original factIds: [${parsed.factIds.join(', ')}]`,
        );
        continue;
      }

      validatedInsights.push({ ...parsed, validFactIds, unknownFactIds });
    }

    if (validatedInsights.length === 0) {
      throw new UnprocessableEntityException(
        'All insights were discarded because none contained valid factIds from the current ContextPack. ' +
        'This usually means the model hallucinated factIds. Try regenerating.',
      );
    }

    this.logger.log(
      `Persisting ${validatedInsights.length} validated insight(s) ` +
      `(${parsedSet.insights.length - validatedInsights.length} discarded).`,
    );

    // Step 8: persist -- store the model name for traceability (ADR-008)
    const records = await this.insightsRepository.createInsightsWithTalkingPoints(
      developerId,
      periodStart,
      periodEnd,
      this.llmProvider.model,
      validatedInsights,
    );

    return records.map(toInsightDto);
  }

  /**
   * Return paginated stored insights for a developer.
   */
  async list(
    developerId: string,
    teamLeadId: string,
    options: ListInsightsOptions,
  ): Promise<PaginatedInsightsResponseDto> {
    // Verify developer exists
    const pack = await this.knowledgeService.buildContextPack(
      developerId,
      teamLeadId,
      options.periodStart ?? new Date(0),
      options.periodEnd ?? new Date(),
    ).catch(() => {
      throw new NotFoundException(`Developer ${developerId} not found.`);
    });

    void pack; // only used for the existence check

    const result = await this.insightsRepository.findByDeveloper(developerId, options);

    return {
      data:  result.data.map(toInsightDto),
      total: result.total,
      page:  result.page,
      limit: result.limit,
    };
  }
}

// ---------------------------------------------------------------------------
// DTO mapper
// ---------------------------------------------------------------------------

function toInsightDto(record: InsightRecord): InsightResponseDto {
  return {
    id:          record.id,
    developerId: record.developerId,
    type:        record.type,
    summary:     record.summary,
    model:       record.model,
    periodStart: record.periodStart.toISOString(),
    periodEnd:   record.periodEnd.toISOString(),
    createdAt:   record.createdAt.toISOString(),
    talkingPoints: record.talkingPoints.map(toTalkingPointDto),
  };
}

function toTalkingPointDto(tp: TalkingPointRecord): TalkingPointResponseDto {
  return {
    id:    tp.id,
    text:  tp.text,
    order: tp.order,
  };
}
