import { Test, TestingModule } from '@nestjs/testing';
import { ObservationType, ObservationSeverity } from '@prisma/client';
import { FactType } from '../../facts/types/facts.types';
import { FactConfidence } from '@prisma/client';
import { KnowledgeService } from '../knowledge.service';
import { ContextBuilderService } from '../context-builder.service';
import { FactsService } from '../../facts/facts.service';
import { DevelopersService } from '../../developers/developers.service';
import { MetricsService } from '../../metrics/metrics.service';
import { ObservationsRepository } from '../../observations/observations.repository';
import { TimelineRepository } from '../../timeline/timeline.repository';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEV_ID = 'dev-1';
const TL_ID = 'tl-1';
const PERIOD_START = new Date('2026-06-01T00:00:00Z');
const PERIOD_END = new Date('2026-07-01T00:00:00Z');

function makeDeveloper(overrides: Record<string, unknown> = {}) {
  return {
    id: DEV_ID,
    name: 'Alice',
    githubLogin: 'alice',
    githubId: 'gh-1',
    role: 'Backend Engineer',
    email: null,
    avatarUrl: null,
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeSnapshot() {
  return {
    id: 'snap-1',
    developerId: DEV_ID,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    pullRequestsOpened: 5,
    pullRequestsMerged: 8,
    pullRequestsClosed: 1,
    averagePrSizeLines: 200,
    averageMergeTimeHours: 4,
    reviewsGiven: 12,
    reviewsReceived: 3,
    activeRepositories: ['api-gateway'],
    repoFocus: { 'api-gateway': 8 },
    createdAt: new Date(),
  } as any;
}

function makeObservation() {
  return {
    id: 'obs-1',
    developerId: DEV_ID,
    teamLeadId: TL_ID,
    type: ObservationType.ACHIEVEMENT,
    severity: ObservationSeverity.HIGH,
    summary: 'Led a major incident response',
    detail: null,
    occurredAt: new Date('2026-06-15T10:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as any;
}

function makeTimelineEntry() {
  return {
    id: 'tl-1',
    developerId: DEV_ID,
    type: 'OBSERVATION',
    summary: 'Led a major incident response',
    occurredAt: new Date('2026-06-15T10:00:00Z'),
    createdAt: new Date(),
    pullRequestId: null,
    pullRequestReviewId: null,
    observationId: 'obs-1',
    insightId: null,
    weeklyReportId: null,
  } as any;
}

function makeFact() {
  return {
    id: 'fact-1',
    developerId: DEV_ID,
    type: FactType.ACTIVITY_SIGNAL,
    statement: 'Merged 8 pull requests between 2026-06-01 and 2026-07-01.',
    confidence: FactConfidence.HIGH,
    evidence: [{ sourceType: 'METRIC_SNAPSHOT', sourceId: 'snap-1' }],
    dedupKey: `${DEV_ID}:ACTIVITY_SIGNAL:snap-1:2026-06-01`,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;
}

// Minimal ContextPack returned by the real ContextBuilderService
function makeContextPack() {
  return {
    developer: { id: DEV_ID, name: 'Alice', githubLogin: 'alice', role: 'Backend Engineer' },
    period: { start: PERIOD_START.toISOString(), end: PERIOD_END.toISOString() },
    metrics: null,
    observations: [],
    timeline: [],
    facts: [],
    evidenceMap: {},
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

describe('KnowledgeService', () => {
  let service: KnowledgeService;
  let contextBuilder: jest.Mocked<ContextBuilderService>;
  let factsService: jest.Mocked<FactsService>;
  let developersService: jest.Mocked<DevelopersService>;
  let metricsService: jest.Mocked<MetricsService>;
  let observationsRepo: jest.Mocked<ObservationsRepository>;
  let timelineRepo: jest.Mocked<TimelineRepository>;

  beforeEach(async () => {
    const mockContextBuilder = {
      build: jest.fn(),
    } as unknown as jest.Mocked<ContextBuilderService>;

    const mockFactsService = {
      findByPeriod: jest.fn(),
    } as unknown as jest.Mocked<FactsService>;

    const mockDevelopersService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<DevelopersService>;

    const mockMetricsService = {
      getSnapshotForPeriod: jest.fn(),
    } as unknown as jest.Mocked<MetricsService>;

    const mockObservationsRepo = {
      findAllByDeveloperAndPeriod: jest.fn(),
    } as unknown as jest.Mocked<ObservationsRepository>;

    const mockTimelineRepo = {
      findByDeveloperAndPeriod: jest.fn(),
    } as unknown as jest.Mocked<TimelineRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: ContextBuilderService, useValue: mockContextBuilder },
        { provide: FactsService, useValue: mockFactsService },
        { provide: DevelopersService, useValue: mockDevelopersService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: ObservationsRepository, useValue: mockObservationsRepo },
        { provide: TimelineRepository, useValue: mockTimelineRepo },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
    contextBuilder = module.get(ContextBuilderService);
    factsService = module.get(FactsService);
    developersService = module.get(DevelopersService);
    metricsService = module.get(MetricsService);
    observationsRepo = module.get(ObservationsRepository);
    timelineRepo = module.get(TimelineRepository);
  });

  // ---------------------------------------------------------------------------
  // buildContextPack
  // ---------------------------------------------------------------------------

  describe('buildContextPack', () => {
    it('fetches all data sources and delegates to ContextBuilderService', async () => {
      const developer = makeDeveloper();
      const snapshot = makeSnapshot();
      const obs = makeObservation();
      const timelineEntry = makeTimelineEntry();
      const fact = makeFact();
      const expectedPack = makeContextPack();

      developersService.findById.mockResolvedValue(developer as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(snapshot);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([timelineEntry]);
      factsService.findByPeriod.mockResolvedValue([fact]);
      contextBuilder.build.mockReturnValue(expectedPack as any);

      const result = await service.buildContextPack(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(result).toBe(expectedPack);
      expect(contextBuilder.build).toHaveBeenCalledTimes(1);
    });

    it('passes all fetched data to ContextBuilderService.build()', async () => {
      const developer = makeDeveloper();
      const snapshot = makeSnapshot();
      const obs = makeObservation();
      const timelineEntry = makeTimelineEntry();
      const fact = makeFact();

      developersService.findById.mockResolvedValue(developer as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(snapshot);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([timelineEntry]);
      factsService.findByPeriod.mockResolvedValue([fact]);
      contextBuilder.build.mockReturnValue(makeContextPack() as any);

      await service.buildContextPack(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const buildArg = contextBuilder.build.mock.calls[0][0];
      expect(buildArg.snapshot).toBe(snapshot);
      expect(buildArg.observations).toEqual([obs]);
      expect(buildArg.timelineEntries).toEqual([timelineEntry]);
      expect(buildArg.facts).toEqual([fact]);
    });

    it('fetches developer, snapshot, observations, timeline, and facts in parallel', async () => {
      const calls: string[] = [];

      developersService.findById.mockImplementation(async () => {
        calls.push('developer');
        return makeDeveloper() as any;
      });
      metricsService.getSnapshotForPeriod.mockImplementation(async () => {
        calls.push('snapshot');
        return null;
      });
      observationsRepo.findAllByDeveloperAndPeriod.mockImplementation(async () => {
        calls.push('observations');
        return [];
      });
      timelineRepo.findByDeveloperAndPeriod.mockImplementation(async () => {
        calls.push('timeline');
        return [];
      });
      factsService.findByPeriod.mockImplementation(async () => {
        calls.push('facts');
        return [];
      });
      contextBuilder.build.mockReturnValue(makeContextPack() as any);

      await service.buildContextPack(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      // developer is fetched first (serial), then the 4 sources in parallel
      expect(calls[0]).toBe('developer');
      expect(calls).toHaveLength(5);
      expect(calls).toContain('snapshot');
      expect(calls).toContain('observations');
      expect(calls).toContain('timeline');
      expect(calls).toContain('facts');
    });

    it('calls timelineRepo.findByDeveloperAndPeriod with correct period bounds', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsService.findByPeriod.mockResolvedValue([]);
      contextBuilder.build.mockReturnValue(makeContextPack() as any);

      await service.buildContextPack(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(timelineRepo.findByDeveloperAndPeriod).toHaveBeenCalledWith(
        DEV_ID,
        PERIOD_START,
        PERIOD_END,
      );
    });

    it('passes null snapshot to ContextBuilderService when no snapshot exists', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsService.findByPeriod.mockResolvedValue([]);
      contextBuilder.build.mockReturnValue(makeContextPack() as any);

      await service.buildContextPack(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const buildArg = contextBuilder.build.mock.calls[0][0];
      expect(buildArg.snapshot).toBeNull();
    });
  });
});
