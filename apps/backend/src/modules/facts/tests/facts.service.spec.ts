import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FactConfidence, ObservationType, ObservationSeverity } from '@prisma/client';
import { FactType } from '../types/facts.types';
import { FactsService } from '../facts.service';
import { FactsRepository } from '../facts.repository';
import { DevelopersService } from '../../developers/developers.service';
import { MetricsService } from '../../metrics/metrics.service';
import { ObservationsRepository } from '../../observations/observations.repository';
import { TimelineRepository } from '../../timeline/timeline.repository';

// ---------------------------------------------------------------------------
// Test data builders
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

function makeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    id: 'snap-1',
    developerId: DEV_ID,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    pullRequestsOpened: 5,
    pullRequestsMerged: 8,
    pullRequestsClosed: 1,
    averagePrSizeLines: 320.5,
    averageMergeTimeHours: 4.2,
    reviewsGiven: 12,
    reviewsReceived: 3,
    activeRepositories: ['api-gateway'],
    repoFocus: { 'api-gateway': 8 },
    createdAt: new Date(),
    ...overrides,
  };
}

function makeObservation(
  type: ObservationType,
  id = 'obs-1',
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    developerId: DEV_ID,
    teamLeadId: TL_ID,
    type,
    severity: ObservationSeverity.MEDIUM,
    summary: 'A relevant observation',
    detail: null,
    occurredAt: new Date('2026-06-15T10:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeTimelineEntry(
  id: string,
  type: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    developerId: DEV_ID,
    type,
    summary: `Timeline event ${id}`,
    occurredAt: new Date('2026-06-15T10:00:00Z'),
    createdAt: new Date(),
    pullRequestId: null,
    pullRequestReviewId: null,
    observationId: null,
    insightId: null,
    weeklyReportId: null,
    pullRequest: null,
    pullRequestReview: null,
    observation: null,
    ...overrides,
  };
}

function makeFact(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fact-1',
    developerId: DEV_ID,
    type: FactType.ACTIVITY_SIGNAL,
    statement: 'Merged 8 pull requests between 2026-06-01 and 2026-07-01.',
    confidence: FactConfidence.HIGH,
    evidence: [{ sourceType: 'METRIC_SNAPSHOT', sourceId: 'snap-1' }],
    dedupKey: `${DEV_ID}:ACTIVITY_SIGNAL:MERGED_PRS:snap-1:2026-06-01`,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

describe('FactsService', () => {
  let service: FactsService;
  let factsRepo: jest.Mocked<FactsRepository>;
  let developersService: jest.Mocked<DevelopersService>;
  let metricsService: jest.Mocked<MetricsService>;
  let observationsRepo: jest.Mocked<ObservationsRepository>;
  let timelineRepo: jest.Mocked<TimelineRepository>;

  beforeEach(async () => {
    const mockFactsRepo = {
      upsertFact: jest.fn(),
      findByDeveloper: jest.fn(),
      findByDeveloperAndPeriod: jest.fn(),
    } as unknown as jest.Mocked<FactsRepository>;

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
        FactsService,
        { provide: FactsRepository, useValue: mockFactsRepo },
        { provide: DevelopersService, useValue: mockDevelopersService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: ObservationsRepository, useValue: mockObservationsRepo },
        { provide: TimelineRepository, useValue: mockTimelineRepo },
      ],
    }).compile();

    service = module.get<FactsService>(FactsService);
    factsRepo = module.get(FactsRepository);
    developersService = module.get(DevelopersService);
    metricsService = module.get(MetricsService);
    observationsRepo = module.get(ObservationsRepository);
    timelineRepo = module.get(TimelineRepository);
  });

  // ---------------------------------------------------------------------------
  // generate -- MetricSnapshot rules (Rules 1-7)
  // ---------------------------------------------------------------------------

  describe('generate -- MetricSnapshot rules', () => {
    // Rule 1
    it('Rule 1: generates ACTIVITY_SIGNAL (merged PRs) from snapshot', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(makeSnapshot() as any);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FactType.ACTIVITY_SIGNAL,
          statement: expect.stringContaining('8 pull requests'),
          confidence: FactConfidence.HIGH,
          dedupKey: expect.stringContaining('MERGED_PRS'),
        }),
      );
    });

    // Rule 2
    it('Rule 2: generates ACTIVITY_SIGNAL (opened PRs) from snapshot', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(makeSnapshot({ pullRequestsOpened: 5 }) as any);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FactType.ACTIVITY_SIGNAL,
          statement: expect.stringContaining('Opened 5 pull requests'),
          dedupKey: expect.stringContaining('OPENED_PRS'),
        }),
      );
    });

    it('Rule 2: skips opened-PRs ACTIVITY_SIGNAL when pullRequestsOpened is 0', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(
        makeSnapshot({ pullRequestsOpened: 0, pullRequestsMerged: 0, reviewsGiven: 0, reviewsReceived: 0, averagePrSizeLines: null, averageMergeTimeHours: null, repoFocus: {} }) as any,
      );
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const calls = factsRepo.upsertFact.mock.calls;
      expect(calls.every(([d]) => !d.dedupKey.includes('OPENED_PRS'))).toBe(true);
    });

    // Rule 3
    it('Rule 3: generates COLLABORATION_SIGNAL (reviews given) from snapshot', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(makeSnapshot() as any);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FactType.COLLABORATION_SIGNAL,
          statement: expect.stringContaining('Gave 12 code reviews'),
          confidence: FactConfidence.HIGH,
          dedupKey: expect.stringContaining('REVIEWS_GIVEN'),
        }),
      );
    });

    // Rule 4
    it('Rule 4: generates COLLABORATION_SIGNAL (reviews received) from snapshot', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(makeSnapshot({ reviewsReceived: 3 }) as any);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FactType.COLLABORATION_SIGNAL,
          statement: expect.stringContaining('Received 3 code reviews'),
          dedupKey: expect.stringContaining('REVIEWS_RECEIVED'),
        }),
      );
    });

    it('Rule 4: skips reviews-received COLLABORATION_SIGNAL when reviewsReceived is 0', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(
        makeSnapshot({ reviewsReceived: 0, pullRequestsMerged: 0, pullRequestsOpened: 0, reviewsGiven: 0, averagePrSizeLines: null, averageMergeTimeHours: null, repoFocus: {} }) as any,
      );
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const calls = factsRepo.upsertFact.mock.calls;
      expect(calls.every(([d]) => !d.dedupKey.includes('REVIEWS_RECEIVED'))).toBe(true);
    });

    // Rule 5
    it('Rule 5: generates METRIC_PATTERN (average PR size) when averagePrSizeLines is set', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(makeSnapshot() as any);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FactType.METRIC_PATTERN,
          statement: expect.stringContaining('321 lines'),
          dedupKey: expect.stringContaining('AVG_PR_SIZE'),
        }),
      );
    });

    // Rule 6
    it('Rule 6: generates METRIC_PATTERN (average merge time) when averageMergeTimeHours is set', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(makeSnapshot({ averageMergeTimeHours: 4.2 }) as any);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FactType.METRIC_PATTERN,
          statement: expect.stringContaining('4.2 hours'),
          dedupKey: expect.stringContaining('AVG_MERGE_TIME'),
        }),
      );
    });

    it('Rule 6: skips merge-time METRIC_PATTERN when averageMergeTimeHours is null', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(
        makeSnapshot({ averageMergeTimeHours: null, pullRequestsMerged: 0, pullRequestsOpened: 0, reviewsGiven: 0, reviewsReceived: 0, averagePrSizeLines: null, repoFocus: {} }) as any,
      );
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const calls = factsRepo.upsertFact.mock.calls;
      expect(calls.every(([d]) => !d.dedupKey.includes('AVG_MERGE_TIME'))).toBe(true);
    });

    // Rule 7
    it('Rule 7: generates METRIC_PATTERN (repo focus) when repoFocus has entries', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(
        makeSnapshot({ repoFocus: { 'api-gateway': 8, 'auth-service': 3 } }) as any,
      );
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FactType.METRIC_PATTERN,
          statement: expect.stringContaining('api-gateway'),
          dedupKey: expect.stringContaining('REPO_FOCUS'),
        }),
      );
    });

    it('Rule 7: selects top repository by contribution count', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(
        makeSnapshot({ repoFocus: { 'small-repo': 2, 'main-api': 15 } }) as any,
      );
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const call = factsRepo.upsertFact.mock.calls.find(([d]) =>
        d.dedupKey.includes('REPO_FOCUS'),
      );
      expect(call![0].statement).toContain('main-api');
      expect(call![0].statement).not.toContain('small-repo');
    });

    it('Rule 7: skips repo focus when repoFocus is empty', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(
        makeSnapshot({ repoFocus: {}, pullRequestsMerged: 0, pullRequestsOpened: 0, reviewsGiven: 0, reviewsReceived: 0, averagePrSizeLines: null, averageMergeTimeHours: null }) as any,
      );
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const calls = factsRepo.upsertFact.mock.calls;
      expect(calls.every(([d]) => !d.dedupKey.includes('REPO_FOCUS'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // generate -- per-observation rules (Rules 8-10)
  // ---------------------------------------------------------------------------

  describe('generate -- per-observation rules', () => {
    // Rule 8
    it('Rule 8: generates ACHIEVEMENT from ACHIEVEMENT observation', async () => {
      const obs = makeObservation(ObservationType.ACHIEVEMENT);
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs as any]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({ type: FactType.ACHIEVEMENT, confidence: FactConfidence.HIGH }),
      );
    });

    it('Rule 8: generates ACHIEVEMENT from LEADERSHIP observation', async () => {
      const obs = makeObservation(ObservationType.LEADERSHIP);
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs as any]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({ type: FactType.ACHIEVEMENT }),
      );
    });

    it('Rule 8: generates ACHIEVEMENT from MENTORING observation', async () => {
      const obs = makeObservation(ObservationType.MENTORING);
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs as any]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({ type: FactType.ACHIEVEMENT }),
      );
    });

    // Rule 9
    it('Rule 9: generates COACHING_SIGNAL from COACHING_OPPORTUNITY observation', async () => {
      const obs = makeObservation(ObservationType.COACHING_OPPORTUNITY);
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs as any]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FactType.COACHING_SIGNAL,
          confidence: FactConfidence.MEDIUM,
        }),
      );
    });

    it('Rule 9: generates COACHING_SIGNAL from CONCERN observation', async () => {
      const obs = makeObservation(ObservationType.CONCERN);
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs as any]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({ type: FactType.COACHING_SIGNAL }),
      );
    });

    // Rule 10
    it('Rule 10: generates OBSERVATION_FACT for CONTEXT observation', async () => {
      const obs = makeObservation(ObservationType.CONTEXT);
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs as any]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FactType.OBSERVATION_FACT,
          confidence: FactConfidence.HIGH,
        }),
      );
    });

    it('Rule 10: generates OBSERVATION_FACT for CUSTOMER_FEEDBACK observation', async () => {
      const obs = makeObservation(ObservationType.CUSTOMER_FEEDBACK);
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs as any]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({ type: FactType.OBSERVATION_FACT }),
      );
    });

    it('per-observation facts use observation summary verbatim as statement', async () => {
      const obs = makeObservation(ObservationType.ACHIEVEMENT, 'obs-1', {
        summary: 'Led the production incident response calmly and effectively.',
      });
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs as any]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({
          statement: 'Led the production incident response calmly and effectively.',
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // generate -- aggregate observation rules (Rules 11-12)
  // ---------------------------------------------------------------------------

  describe('generate -- aggregate observation rules', () => {
    // Rule 11
    it('Rule 11: generates count-by-type OBSERVATION_FACT when same type has 2+ observations', async () => {
      const obs1 = makeObservation(ObservationType.CUSTOMER_FEEDBACK, 'obs-1');
      const obs2 = makeObservation(ObservationType.CUSTOMER_FEEDBACK, 'obs-2');
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs1, obs2] as any);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FactType.OBSERVATION_FACT,
          statement: expect.stringContaining('2 customer feedback observations'),
          dedupKey: expect.stringContaining('COUNT:CUSTOMER_FEEDBACK'),
        }),
      );
    });

    it('Rule 11: aggregate evidence includes all observations of that type', async () => {
      const obs1 = makeObservation(ObservationType.CUSTOMER_FEEDBACK, 'obs-1');
      const obs2 = makeObservation(ObservationType.CUSTOMER_FEEDBACK, 'obs-2');
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs1, obs2] as any);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const call = factsRepo.upsertFact.mock.calls.find(([d]) =>
        d.dedupKey.includes('COUNT:CUSTOMER_FEEDBACK'),
      );
      expect(call![0].evidence).toHaveLength(2);
      expect(call![0].evidence).toEqual(
        expect.arrayContaining([
          { sourceType: 'OBSERVATION', sourceId: 'obs-1' },
          { sourceType: 'OBSERVATION', sourceId: 'obs-2' },
        ]),
      );
    });

    it('Rule 11: does NOT generate count-by-type aggregate for a type with only 1 observation', async () => {
      const obs = makeObservation(ObservationType.CUSTOMER_FEEDBACK, 'obs-1');
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs] as any);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const calls = factsRepo.upsertFact.mock.calls;
      expect(calls.every(([d]) => !d.dedupKey.includes('COUNT:'))).toBe(true);
    });

    it('Rule 11: generates separate count facts per type when multiple types each have 2+ observations', async () => {
      const cf1 = makeObservation(ObservationType.CUSTOMER_FEEDBACK, 'obs-1');
      const cf2 = makeObservation(ObservationType.CUSTOMER_FEEDBACK, 'obs-2');
      const ld1 = makeObservation(ObservationType.LEADERSHIP, 'obs-3');
      const ld2 = makeObservation(ObservationType.LEADERSHIP, 'obs-4');
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([cf1, cf2, ld1, ld2] as any);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const countCalls = factsRepo.upsertFact.mock.calls.filter(([d]) =>
        d.dedupKey.includes('COUNT:'),
      );
      expect(countCalls).toHaveLength(2);
    });

    // Rule 12
    it('Rule 12: generates OBSERVATION_FACT for high-severity observations', async () => {
      const obs = makeObservation(ObservationType.CONCERN, 'obs-1', {
        severity: ObservationSeverity.HIGH,
      });
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs] as any);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FactType.OBSERVATION_FACT,
          statement: expect.stringContaining('high-severity'),
          dedupKey: expect.stringContaining('HIGH_SEVERITY'),
        }),
      );
    });

    it('Rule 12: high-severity evidence includes all HIGH observations', async () => {
      const obs1 = makeObservation(ObservationType.CONCERN, 'obs-1', { severity: ObservationSeverity.HIGH });
      const obs2 = makeObservation(ObservationType.INCIDENT, 'obs-2', { severity: ObservationSeverity.HIGH });
      const obs3 = makeObservation(ObservationType.CONTEXT, 'obs-3', { severity: ObservationSeverity.MEDIUM });
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs1, obs2, obs3] as any);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const call = factsRepo.upsertFact.mock.calls.find(([d]) =>
        d.dedupKey.includes('HIGH_SEVERITY'),
      );
      expect(call![0].evidence).toHaveLength(2);
      expect(call![0].statement).toContain('2 high-severity');
    });

    it('Rule 12: does NOT generate high-severity fact when no HIGH observations exist', async () => {
      const obs = makeObservation(ObservationType.CONCERN, 'obs-1', {
        severity: ObservationSeverity.MEDIUM,
      });
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([obs] as any);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const calls = factsRepo.upsertFact.mock.calls;
      expect(calls.every(([d]) => !d.dedupKey.includes('HIGH_SEVERITY'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // generate -- timeline rules (Rules 13-14)
  // ---------------------------------------------------------------------------

  describe('generate -- timeline rules', () => {
    // Rule 13
    it('Rule 13: generates ACTIVITY_SIGNAL for timeline entry count', async () => {
      const entries = [
        makeTimelineEntry('tl-1', 'SIGNAL'),
        makeTimelineEntry('tl-2', 'SIGNAL'),
        makeTimelineEntry('tl-3', 'OBSERVATION'),
      ];
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue(entries as any);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FactType.ACTIVITY_SIGNAL,
          statement: expect.stringContaining('3 activity entries'),
          dedupKey: expect.stringContaining('TIMELINE_COUNT'),
        }),
      );
    });

    it('Rule 13: timeline count evidence bookends first and last entries', async () => {
      const entries = [
        makeTimelineEntry('tl-first', 'SIGNAL', { occurredAt: new Date('2026-06-01') }),
        makeTimelineEntry('tl-middle', 'SIGNAL', { occurredAt: new Date('2026-06-15') }),
        makeTimelineEntry('tl-last', 'SIGNAL', { occurredAt: new Date('2026-06-30') }),
      ];
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue(entries as any);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const call = factsRepo.upsertFact.mock.calls.find(([d]) =>
        d.dedupKey.includes('TIMELINE_COUNT'),
      );
      const evidenceIds = call![0].evidence.map((e: any) => e.sourceId);
      expect(evidenceIds).toContain('tl-first');
      expect(evidenceIds).toContain('tl-last');
      expect(evidenceIds).not.toContain('tl-middle');
    });

    it('Rule 13: uses singular form for 1 entry', async () => {
      const entries = [makeTimelineEntry('tl-1', 'SIGNAL')];
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue(entries as any);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const call = factsRepo.upsertFact.mock.calls.find(([d]) =>
        d.dedupKey.includes('TIMELINE_COUNT'),
      );
      expect(call![0].statement).toContain('1 activity entry was recorded');
    });

    // Rule 14
    it('Rule 14: generates OBSERVATION_FACT for most recent notable timeline event', async () => {
      const entries = [
        makeTimelineEntry('tl-signal', 'SIGNAL', { occurredAt: new Date('2026-06-01') }),
        makeTimelineEntry('tl-achieve', 'ACHIEVEMENT', {
          occurredAt: new Date('2026-06-10'),
          summary: 'Led the architecture review session.',
        }),
      ];
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue(entries as any);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(factsRepo.upsertFact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FactType.OBSERVATION_FACT,
          statement: expect.stringContaining('Led the architecture review session.'),
          dedupKey: expect.stringContaining('TIMELINE_RECENT'),
        }),
      );
    });

    it('Rule 14: picks the MOST RECENT notable entry (ASC order -- last in array)', async () => {
      const entries = [
        makeTimelineEntry('tl-old', 'ACHIEVEMENT', {
          occurredAt: new Date('2026-06-05'),
          summary: 'Older notable event.',
        }),
        makeTimelineEntry('tl-new', 'OBSERVATION', {
          occurredAt: new Date('2026-06-20'),
          summary: 'More recent notable event.',
        }),
      ];
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue(entries as any);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const call = factsRepo.upsertFact.mock.calls.find(([d]) =>
        d.dedupKey.includes('TIMELINE_RECENT'),
      );
      expect(call![0].statement).toContain('More recent notable event.');
      expect(call![0].statement).not.toContain('Older notable event.');
    });

    it('Rule 14: skips most-recent-event fact when no ACHIEVEMENT or OBSERVATION entries exist', async () => {
      const entries = [
        makeTimelineEntry('tl-1', 'SIGNAL'),
        makeTimelineEntry('tl-2', 'SIGNAL'),
      ];
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue(entries as any);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const calls = factsRepo.upsertFact.mock.calls;
      expect(calls.every(([d]) => !d.dedupKey.includes('TIMELINE_RECENT'))).toBe(true);
    });

    it('Rules 13-14: generates no timeline facts when timeline is empty', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);

      const facts = await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(facts).toHaveLength(0);
      expect(factsRepo.upsertFact).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // generate -- general behaviour
  // ---------------------------------------------------------------------------

  describe('generate -- general behaviour', () => {
    it('produces deterministic dedupKey for merged-PRs ACTIVITY_SIGNAL', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(makeSnapshot() as any);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const call = factsRepo.upsertFact.mock.calls.find(([d]) =>
        d.dedupKey.includes('MERGED_PRS'),
      );
      expect(call![0].dedupKey).toBe(`${DEV_ID}:ACTIVITY_SIGNAL:MERGED_PRS:snap-1:2026-06-01`);
    });

    it('produces deterministic dedupKey for reviews-given COLLABORATION_SIGNAL', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(makeSnapshot() as any);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
      factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

      await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      const call = factsRepo.upsertFact.mock.calls.find(([d]) =>
        d.dedupKey.includes('REVIEWS_GIVEN'),
      );
      expect(call![0].dedupKey).toBe(
        `${DEV_ID}:COLLABORATION_SIGNAL:REVIEWS_GIVEN:snap-1:2026-06-01`,
      );
    });

    it('generates no facts when no snapshot, no observations, and no timeline entries', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      metricsService.getSnapshotForPeriod.mockResolvedValue(null);
      observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
      timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);

      const facts = await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

      expect(facts).toHaveLength(0);
      expect(factsRepo.upsertFact).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for unknown developer', async () => {
      developersService.findById.mockRejectedValue(new NotFoundException());

      await expect(
        service.generate('unknown', TL_ID, PERIOD_START, PERIOD_END),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------

  describe('list', () => {
    it('returns paginated facts', async () => {
      const fact = makeFact();
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      factsRepo.findByDeveloper.mockResolvedValue({
        data: [fact as any],
        total: 1,
        page: 1,
        limit: 20,
      });

      const result = await service.list(DEV_ID, TL_ID, { page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe(FactType.ACTIVITY_SIGNAL);
    });

    it('forwards type filter to repository', async () => {
      developersService.findById.mockResolvedValue(makeDeveloper() as any);
      factsRepo.findByDeveloper.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await service.list(DEV_ID, TL_ID, { type: FactType.ACHIEVEMENT, page: 1, limit: 20 });

      expect(factsRepo.findByDeveloper).toHaveBeenCalledWith(DEV_ID, {
        type: FactType.ACHIEVEMENT,
        page: 1,
        limit: 20,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // findByPeriod
  // ---------------------------------------------------------------------------

  describe('findByPeriod', () => {
    it('delegates to repository and returns fact records', async () => {
      const fact = makeFact();
      factsRepo.findByDeveloperAndPeriod.mockResolvedValue([fact as any]);

      const results = await service.findByPeriod(DEV_ID, PERIOD_START, PERIOD_END);

      expect(results).toHaveLength(1);
      expect(factsRepo.findByDeveloperAndPeriod).toHaveBeenCalledWith(DEV_ID, PERIOD_START, PERIOD_END);
    });

    it('returns empty array when no facts in period', async () => {
      factsRepo.findByDeveloperAndPeriod.mockResolvedValue([]);

      const results = await service.findByPeriod(DEV_ID, PERIOD_START, PERIOD_END);

      expect(results).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Confidence thresholds
  // ---------------------------------------------------------------------------

  describe('confidence thresholds', () => {
    it.each([
      [1, FactConfidence.LOW],
      [3, FactConfidence.MEDIUM],
      [6, FactConfidence.HIGH],
    ])(
      'merged-PRs ACTIVITY_SIGNAL with %d PRs gets confidence %s',
      async (merged, expectedConfidence) => {
        developersService.findById.mockResolvedValue(makeDeveloper() as any);
        metricsService.getSnapshotForPeriod.mockResolvedValue(
          makeSnapshot({
            pullRequestsMerged: merged,
            pullRequestsOpened: 0,
            reviewsGiven: 0,
            reviewsReceived: 0,
            averagePrSizeLines: null,
            averageMergeTimeHours: null,
            repoFocus: {},
          }) as any,
        );
        observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
        timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
        factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

        await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

        expect(factsRepo.upsertFact).toHaveBeenCalledWith(
          expect.objectContaining({
            dedupKey: expect.stringContaining('MERGED_PRS'),
            confidence: expectedConfidence,
          }),
        );
      },
    );

    it.each([
      [1, FactConfidence.LOW],
      [5, FactConfidence.MEDIUM],
      [11, FactConfidence.HIGH],
    ])(
      'reviews-given COLLABORATION_SIGNAL with %d reviews gets confidence %s',
      async (reviews, expectedConfidence) => {
        developersService.findById.mockResolvedValue(makeDeveloper() as any);
        metricsService.getSnapshotForPeriod.mockResolvedValue(
          makeSnapshot({
            pullRequestsMerged: 0,
            pullRequestsOpened: 0,
            reviewsGiven: reviews,
            reviewsReceived: 0,
            averagePrSizeLines: null,
            averageMergeTimeHours: null,
            repoFocus: {},
          }) as any,
        );
        observationsRepo.findAllByDeveloperAndPeriod.mockResolvedValue([]);
        timelineRepo.findByDeveloperAndPeriod.mockResolvedValue([]);
        factsRepo.upsertFact.mockImplementation(async (data) => makeFact(data as any) as any);

        await service.generate(DEV_ID, TL_ID, PERIOD_START, PERIOD_END);

        expect(factsRepo.upsertFact).toHaveBeenCalledWith(
          expect.objectContaining({
            dedupKey: expect.stringContaining('REVIEWS_GIVEN'),
            confidence: expectedConfidence,
          }),
        );
      },
    );
  });
});
