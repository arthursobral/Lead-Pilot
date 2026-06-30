import { UnprocessableEntityException, NotFoundException } from '@nestjs/common';
import { InsightsService } from '../insights.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { FactsService } from '../../facts/facts.service';
import type { ILlmProvider } from '../../ai/interfaces/llm-provider.interface';
import { PromptBuilderService } from '../../ai/prompt-builder.service';
import { InsightParserService } from '../../ai/insight-parser.service';
import { InsightsRepository } from '../insights.repository';
import { InsightType, FactConfidence } from '@prisma/client';
import { FactType } from '../../facts/types/facts.types';
import type { ContextPack } from '../../knowledge/types/knowledge.types';
import type { InsightRecord } from '../types/insights.types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DEV_ID   = 'dev-1';
const LEAD_ID  = 'lead-1';
const PERIOD_S = new Date('2026-06-01T00:00:00Z');
const PERIOD_E = new Date('2026-07-01T00:00:00Z');

function makePack(factIds: string[] = ['fact-1', 'fact-2']): ContextPack {
  return {
    developer:   { id: DEV_ID, name: 'Alice', githubLogin: 'alice', role: 'Engineer' },
    period:      { start: PERIOD_S.toISOString(), end: PERIOD_E.toISOString() },
    metrics:     null,
    observations: [],
    timeline:    [],
    facts: factIds.map((id, i) => ({
      id,
      type:       FactType.ACTIVITY_SIGNAL,
      statement:  `Statement ${i + 1}`,
      confidence: FactConfidence.HIGH,
      evidence:   [{ sourceType: 'METRIC_SNAPSHOT' as const, sourceId: 'snap-1' }],
    })),
    evidenceMap: {},
    generatedAt: new Date().toISOString(),
  };
}

function makeInsightRecord(overrides: Partial<InsightRecord> = {}): InsightRecord {
  return {
    id:          'ins-1',
    developerId: DEV_ID,
    type:        InsightType.POSITIVE_SIGNAL,
    summary:     'Alice may be showing growing ownership.',
    model:       'qwen2.5-coder:7b',
    periodStart: PERIOD_S,
    periodEnd:   PERIOD_E,
    createdAt:   new Date(),
    talkingPoints: [
      { id: 'tp-1', insightId: 'ins-1', text: 'Ask about scope.', order: 0, createdAt: new Date() },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup -- note: llmProvider is typed as ILlmProvider, not OllamaProvider
// ---------------------------------------------------------------------------

function buildService(llmProviderOverride?: Partial<ILlmProvider>) {
  const knowledgeService   = { buildContextPack: jest.fn() } as unknown as KnowledgeService;
  const factsService       = { generate: jest.fn() }         as unknown as FactsService;
  const llmProvider: ILlmProvider = {
    chat:  jest.fn(),
    model: 'qwen2.5-coder:7b',
    ...llmProviderOverride,
  };
  const promptBuilder = {
    buildSystemPrompt: jest.fn().mockReturnValue('sys'),
    buildUserPrompt:   jest.fn().mockReturnValue('user'),
  } as unknown as PromptBuilderService;
  const insightParser      = { parse: jest.fn() } as unknown as InsightParserService;
  const insightsRepository = {
    createInsightsWithTalkingPoints: jest.fn(),
    findByDeveloper: jest.fn(),
  } as unknown as InsightsRepository;

  const service = new InsightsService(
    knowledgeService,
    factsService,
    llmProvider,
    promptBuilder,
    insightParser,
    insightsRepository,
  );

  return { service, knowledgeService, factsService, llmProvider, promptBuilder, insightParser, insightsRepository };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InsightsService', () => {
  describe('generate()', () => {
    it('calls factsService.generate before building the context pack', async () => {
      const { service, factsService, knowledgeService, llmProvider, insightParser, insightsRepository } = buildService();

      jest.mocked(knowledgeService.buildContextPack).mockResolvedValue(makePack());
      jest.mocked(llmProvider.chat as jest.Mock).mockResolvedValue('');
      jest.mocked(insightParser.parse).mockReturnValue({
        insights: [{ type: InsightType.POSITIVE_SIGNAL, summary: 'S', talkingPoints: ['TP'], factIds: ['fact-1'] }],
      });
      jest.mocked(insightsRepository.createInsightsWithTalkingPoints).mockResolvedValue([makeInsightRecord()]);

      await service.generate(DEV_ID, LEAD_ID, PERIOD_S, PERIOD_E);

      expect(factsService.generate).toHaveBeenCalledWith(DEV_ID, LEAD_ID, PERIOD_S, PERIOD_E);
    });

    it('calls knowledgeService.buildContextPack with the correct arguments', async () => {
      const { service, knowledgeService, llmProvider, insightParser, insightsRepository } = buildService();

      jest.mocked(knowledgeService.buildContextPack).mockResolvedValue(makePack());
      jest.mocked(llmProvider.chat as jest.Mock).mockResolvedValue('');
      jest.mocked(insightParser.parse).mockReturnValue({
        insights: [{ type: InsightType.POSITIVE_SIGNAL, summary: 'S', talkingPoints: ['TP'], factIds: ['fact-1'] }],
      });
      jest.mocked(insightsRepository.createInsightsWithTalkingPoints).mockResolvedValue([makeInsightRecord()]);

      await service.generate(DEV_ID, LEAD_ID, PERIOD_S, PERIOD_E);

      expect(knowledgeService.buildContextPack).toHaveBeenCalledWith(DEV_ID, LEAD_ID, PERIOD_S, PERIOD_E);
    });

    it('throws UnprocessableEntityException when context pack has no facts', async () => {
      const { service, knowledgeService } = buildService();
      jest.mocked(knowledgeService.buildContextPack).mockResolvedValue(makePack([]));

      await expect(
        service.generate(DEV_ID, LEAD_ID, PERIOD_S, PERIOD_E),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('returns mapped InsightResponseDtos on success', async () => {
      const { service, knowledgeService, llmProvider, insightParser, insightsRepository } = buildService();

      jest.mocked(knowledgeService.buildContextPack).mockResolvedValue(makePack(['fact-1']));
      jest.mocked(llmProvider.chat as jest.Mock).mockResolvedValue('');
      jest.mocked(insightParser.parse).mockReturnValue({
        insights: [{ type: InsightType.POSITIVE_SIGNAL, summary: 'S', talkingPoints: ['TP'], factIds: ['fact-1'] }],
      });
      jest.mocked(insightsRepository.createInsightsWithTalkingPoints).mockResolvedValue([makeInsightRecord()]);

      const result = await service.generate(DEV_ID, LEAD_ID, PERIOD_S, PERIOD_E);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ins-1');
      expect(result[0].type).toBe(InsightType.POSITIVE_SIGNAL);
      expect(result[0].talkingPoints).toHaveLength(1);
      expect(result[0].talkingPoints[0].text).toBe('Ask about scope.');
    });

    it('persists only valid factIds and warns about unknown ones', async () => {
      const { service, knowledgeService, llmProvider, insightParser, insightsRepository } = buildService();

      jest.mocked(knowledgeService.buildContextPack).mockResolvedValue(makePack(['fact-1']));
      jest.mocked(llmProvider.chat as jest.Mock).mockResolvedValue('');
      jest.mocked(insightParser.parse).mockReturnValue({
        insights: [{
          type: InsightType.POSITIVE_SIGNAL,
          summary: 'S',
          talkingPoints: ['TP'],
          factIds: ['fact-1', 'fact-INVENTED'],
        }],
      });
      jest.mocked(insightsRepository.createInsightsWithTalkingPoints).mockResolvedValue([makeInsightRecord()]);

      await service.generate(DEV_ID, LEAD_ID, PERIOD_S, PERIOD_E);

      const call = jest.mocked(insightsRepository.createInsightsWithTalkingPoints).mock.calls[0];
      const persistedInsights = call[4];
      expect(persistedInsights[0].validFactIds).toEqual(['fact-1']);
      expect(persistedInsights[0].unknownFactIds).toEqual(['fact-INVENTED']);
    });

    it('discards insights with zero valid factIds', async () => {
      const { service, knowledgeService, llmProvider, insightParser, insightsRepository } = buildService();

      jest.mocked(knowledgeService.buildContextPack).mockResolvedValue(makePack(['fact-real']));
      jest.mocked(llmProvider.chat as jest.Mock).mockResolvedValue('');
      jest.mocked(insightParser.parse).mockReturnValue({
        insights: [
          { type: InsightType.POSITIVE_SIGNAL,      summary: 'S1', talkingPoints: ['TP'], factIds: ['fact-HALLUCINATED'] },
          { type: InsightType.COACHING_OPPORTUNITY, summary: 'S2', talkingPoints: ['TP'], factIds: ['fact-real'] },
        ],
      });
      jest.mocked(insightsRepository.createInsightsWithTalkingPoints).mockResolvedValue([makeInsightRecord()]);

      await service.generate(DEV_ID, LEAD_ID, PERIOD_S, PERIOD_E);

      const call = jest.mocked(insightsRepository.createInsightsWithTalkingPoints).mock.calls[0];
      const persistedInsights = call[4];
      expect(persistedInsights).toHaveLength(1);
      expect(persistedInsights[0].type).toBe(InsightType.COACHING_OPPORTUNITY);
    });

    it('throws UnprocessableEntityException when ALL insights are discarded', async () => {
      const { service, knowledgeService, llmProvider, insightParser } = buildService();

      jest.mocked(knowledgeService.buildContextPack).mockResolvedValue(makePack(['fact-real']));
      jest.mocked(llmProvider.chat as jest.Mock).mockResolvedValue('');
      jest.mocked(insightParser.parse).mockReturnValue({
        insights: [
          { type: InsightType.POSITIVE_SIGNAL, summary: 'S', talkingPoints: ['TP'], factIds: ['fact-HALLUCINATED'] },
        ],
      });

      await expect(
        service.generate(DEV_ID, LEAD_ID, PERIOD_S, PERIOD_E),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('stores llmProvider.model (not a hardcoded string) in the persisted record', async () => {
      const { service, knowledgeService, llmProvider, insightParser, insightsRepository } = buildService();

      jest.mocked(knowledgeService.buildContextPack).mockResolvedValue(makePack(['fact-1']));
      jest.mocked(llmProvider.chat as jest.Mock).mockResolvedValue('');
      jest.mocked(insightParser.parse).mockReturnValue({
        insights: [{ type: InsightType.POSITIVE_SIGNAL, summary: 'S', talkingPoints: ['TP'], factIds: ['fact-1'] }],
      });
      jest.mocked(insightsRepository.createInsightsWithTalkingPoints).mockResolvedValue([makeInsightRecord()]);

      await service.generate(DEV_ID, LEAD_ID, PERIOD_S, PERIOD_E);

      const call = jest.mocked(insightsRepository.createInsightsWithTalkingPoints).mock.calls[0];
      expect(call[3]).toBe('qwen2.5-coder:7b');
    });

    // -------------------------------------------------------------------------
    // Provider abstraction test
    // -------------------------------------------------------------------------

    it('works with any ILlmProvider implementation, not just OllamaProvider', async () => {
      // Arrange: a FakeLlmProvider that has nothing to do with Ollama
      const fakeLlm: ILlmProvider = {
        model: 'fake-model-v1',
        chat:  jest.fn().mockResolvedValue(''),
      };

      const { service, knowledgeService, insightParser, insightsRepository } =
        buildService({ model: fakeLlm.model, chat: fakeLlm.chat as jest.Mock });

      jest.mocked(knowledgeService.buildContextPack).mockResolvedValue(makePack(['fact-1']));
      jest.mocked(insightParser.parse).mockReturnValue({
        insights: [{ type: InsightType.POSITIVE_SIGNAL, summary: 'S', talkingPoints: ['TP'], factIds: ['fact-1'] }],
      });
      jest.mocked(insightsRepository.createInsightsWithTalkingPoints).mockResolvedValue([
        makeInsightRecord({ model: 'fake-model-v1' }),
      ]);

      const result = await service.generate(DEV_ID, LEAD_ID, PERIOD_S, PERIOD_E);

      // The model name from the fake provider is stored in the persisted insight
      const repoCall = jest.mocked(insightsRepository.createInsightsWithTalkingPoints).mock.calls[0];
      expect(repoCall[3]).toBe('fake-model-v1');
      expect(result[0].model).toBe('fake-model-v1');
    });
  });

  describe('list()', () => {
    it('returns paginated insights from repository', async () => {
      const { service, knowledgeService, insightsRepository } = buildService();

      jest.mocked(knowledgeService.buildContextPack).mockResolvedValue(makePack());
      jest.mocked(insightsRepository.findByDeveloper).mockResolvedValue({
        data:  [makeInsightRecord()],
        total: 1,
        page:  1,
        limit: 20,
      });

      const result = await service.list(DEV_ID, LEAD_ID, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(insightsRepository.findByDeveloper).toHaveBeenCalledWith(DEV_ID, { page: 1, limit: 20 });
    });

    it('throws NotFoundException when developer does not exist', async () => {
      const { service, knowledgeService } = buildService();

      jest.mocked(knowledgeService.buildContextPack).mockRejectedValue(new NotFoundException('not found'));

      await expect(
        service.list(DEV_ID, LEAD_ID, { page: 1, limit: 20 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
