import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from '../metrics.service';
import { MetricsRepository } from '../metrics.repository';
import type { PrDataResult, ReviewDataResult } from '../types/metrics.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePrData(overrides: Partial<PrDataResult> = {}): PrDataResult {
  return { opened: [], merged: [], closedCount: 0, ...overrides };
}

function makeReviewData(overrides: Partial<ReviewDataResult> = {}): ReviewDataResult {
  return { given: 0, received: 0, ...overrides };
}

function makeMergedPr(overrides: Partial<{
  additions: number;
  deletions: number;
  githubCreatedAt: Date;
  mergedAt: Date;
  repositoryFullName: string;
}> = {}) {
  return {
    additions: 100,
    deletions: 50,
    githubCreatedAt: new Date('2026-06-01T10:00:00Z'),
    mergedAt: new Date('2026-06-02T10:00:00Z'), // 24h later
    repositoryFullName: 'org/repo',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MetricsService', () => {
  let service: MetricsService;
  let repository: jest.Mocked<MetricsRepository>;

  beforeEach(async () => {
    const mockRepository = {
      fetchPrData: jest.fn(),
      fetchReviewData: jest.fn(),
      upsertSnapshot: jest.fn(),
      findLatestSnapshot: jest.fn(),
      findSnapshotForPeriod: jest.fn(),
    } as unknown as jest.Mocked<MetricsRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: MetricsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    repository = module.get(MetricsRepository);
  });

  // -------------------------------------------------------------------------
  // compute() -- pure function tests
  // -------------------------------------------------------------------------

  describe('compute()', () => {
    it('returns all zeros and null averages when there is no data', () => {
      const result = service.compute(makePrData(), makeReviewData());
      expect(result.pullRequestsOpened).toBe(0);
      expect(result.pullRequestsMerged).toBe(0);
      expect(result.pullRequestsClosed).toBe(0);
      expect(result.averagePrSizeLines).toBeNull();
      expect(result.averageMergeTimeHours).toBeNull();
      expect(result.reviewsGiven).toBe(0);
      expect(result.reviewsReceived).toBe(0);
      expect(result.activeRepositories).toEqual([]);
    });

    it('counts opened PRs correctly', () => {
      const prData = makePrData({
        opened: [
          { repositoryFullName: 'org/a' },
          { repositoryFullName: 'org/b' },
          { repositoryFullName: 'org/a' },
        ],
      });
      expect(service.compute(prData, makeReviewData()).pullRequestsOpened).toBe(3);
    });

    it('counts merged PRs correctly', () => {
      const prData = makePrData({ merged: [makeMergedPr(), makeMergedPr()] });
      expect(service.compute(prData, makeReviewData()).pullRequestsMerged).toBe(2);
    });

    it('counts closed PRs from closedCount', () => {
      expect(service.compute(makePrData({ closedCount: 5 }), makeReviewData()).pullRequestsClosed).toBe(5);
    });

    it('calculates averagePrSizeLines as (additions + deletions) / count', () => {
      const prData = makePrData({
        merged: [
          makeMergedPr({ additions: 100, deletions: 50 }), // 150
          makeMergedPr({ additions: 200, deletions: 100 }), // 300
        ],
      });
      // (150 + 300) / 2 = 225
      expect(service.compute(prData, makeReviewData()).averagePrSizeLines).toBe(225);
    });

    it('returns null averagePrSizeLines when there are no merged PRs', () => {
      expect(service.compute(makePrData(), makeReviewData()).averagePrSizeLines).toBeNull();
    });

    it('calculates averageMergeTimeHours correctly', () => {
      const open = new Date('2026-06-01T10:00:00Z');
      const prData = makePrData({
        merged: [
          makeMergedPr({ githubCreatedAt: open, mergedAt: new Date('2026-06-02T10:00:00Z') }), // 24h
          makeMergedPr({ githubCreatedAt: open, mergedAt: new Date('2026-06-03T10:00:00Z') }), // 48h
        ],
      });
      // (24 + 48) / 2 = 36
      expect(service.compute(prData, makeReviewData()).averageMergeTimeHours).toBe(36);
    });

    it('returns null averageMergeTimeHours when there are no merged PRs', () => {
      expect(service.compute(makePrData(), makeReviewData()).averageMergeTimeHours).toBeNull();
    });

    it('counts review activity correctly', () => {
      const result = service.compute(makePrData(), makeReviewData({ given: 12, received: 7 }));
      expect(result.reviewsGiven).toBe(12);
      expect(result.reviewsReceived).toBe(7);
    });

    it('deduplicates activeRepositories across opened and merged sets', () => {
      const prData = makePrData({
        opened: [{ repositoryFullName: 'org/a' }, { repositoryFullName: 'org/b' }],
        merged: [
          makeMergedPr({ repositoryFullName: 'org/b' }), // duplicate
          makeMergedPr({ repositoryFullName: 'org/c' }),
        ],
      });
      expect(service.compute(prData, makeReviewData()).activeRepositories.sort()).toEqual(
        ['org/a', 'org/b', 'org/c'],
      );
    });

    it('includes repos from merged PRs even when not in opened set', () => {
      // PR opened before the period, merged in this period
      const prData = makePrData({
        merged: [makeMergedPr({ repositoryFullName: 'org/legacy' })],
      });
      expect(service.compute(prData, makeReviewData()).activeRepositories).toContain('org/legacy');
    });

    // -----------------------------------------------------------------------
    // repoFocus
    // -----------------------------------------------------------------------

    it('returns empty repoFocus when there are no merged PRs', () => {
      const result = service.compute(makePrData(), makeReviewData());
      expect(result.repoFocus).toEqual({});
    });

    it('counts merged PRs per repository correctly', () => {
      const prData = makePrData({
        merged: [
          makeMergedPr({ repositoryFullName: 'org/payments-service' }),
          makeMergedPr({ repositoryFullName: 'org/api-gateway' }),
          makeMergedPr({ repositoryFullName: 'org/payments-service' }),
          makeMergedPr({ repositoryFullName: 'org/payments-service' }),
        ],
      });
      expect(service.compute(prData, makeReviewData()).repoFocus).toEqual({
        'org/payments-service': 3,
        'org/api-gateway': 1,
      });
    });

    it('sorts repoFocus entries descending by count', () => {
      const prData = makePrData({
        merged: [
          makeMergedPr({ repositoryFullName: 'org/low' }),       // 1 PR
          makeMergedPr({ repositoryFullName: 'org/high' }),      // 3 PRs
          makeMergedPr({ repositoryFullName: 'org/high' }),
          makeMergedPr({ repositoryFullName: 'org/high' }),
          makeMergedPr({ repositoryFullName: 'org/medium' }),    // 2 PRs
          makeMergedPr({ repositoryFullName: 'org/medium' }),
        ],
      });
      const keys = Object.keys(service.compute(prData, makeReviewData()).repoFocus);
      expect(keys).toEqual(['org/high', 'org/medium', 'org/low']);
    });

    it('does not include repos from opened-only PRs in repoFocus', () => {
      // PR was opened this period but not yet merged -- should not appear in repoFocus
      const prData = makePrData({
        opened: [{ repositoryFullName: 'org/wip' }],
        merged: [makeMergedPr({ repositoryFullName: 'org/done' })],
      });
      const focus = service.compute(prData, makeReviewData()).repoFocus;
      expect(focus['org/wip']).toBeUndefined();
      expect(focus['org/done']).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // calculateForDeveloper() -- integration with repository
  // -------------------------------------------------------------------------

  describe('calculateForDeveloper()', () => {
    const developerId = 'dev-123';
    const periodStart = new Date('2026-05-25T00:00:00Z');
    const periodEnd = new Date('2026-06-24T00:00:00Z');

    it('fetches PR and review data in parallel then upserts the snapshot', async () => {
      const prData = makePrData({ opened: [{ repositoryFullName: 'org/repo' }], merged: [makeMergedPr()] });
      const reviewData = makeReviewData({ given: 5, received: 3 });
      const fakeSnapshot = { id: 'snap-1' } as any;

      repository.fetchPrData.mockResolvedValue(prData);
      repository.fetchReviewData.mockResolvedValue(reviewData);
      repository.upsertSnapshot.mockResolvedValue(fakeSnapshot);

      const result = await service.calculateForDeveloper(developerId, periodStart, periodEnd);

      expect(repository.fetchPrData).toHaveBeenCalledWith(developerId, periodStart, periodEnd);
      expect(repository.fetchReviewData).toHaveBeenCalledWith(developerId, periodStart, periodEnd);
      expect(repository.upsertSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          developerId,
          periodStart,
          periodEnd,
          pullRequestsOpened: 1,
          pullRequestsMerged: 1,
          reviewsGiven: 5,
          reviewsReceived: 3,
        }),
      );
      expect(result).toBe(fakeSnapshot);
    });

    it('writes null for average fields when there are no merged PRs', async () => {
      repository.fetchPrData.mockResolvedValue(makePrData({ opened: [{ repositoryFullName: 'org/repo' }] }));
      repository.fetchReviewData.mockResolvedValue(makeReviewData());
      repository.upsertSnapshot.mockResolvedValue({ id: 'snap-2' } as any);

      await service.calculateForDeveloper(developerId, periodStart, periodEnd);

      expect(repository.upsertSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ averagePrSizeLines: null, averageMergeTimeHours: null }),
      );
    });

    it('writes an all-zero snapshot when developer has no activity', async () => {
      repository.fetchPrData.mockResolvedValue(makePrData());
      repository.fetchReviewData.mockResolvedValue(makeReviewData());
      repository.upsertSnapshot.mockResolvedValue({ id: 'snap-3' } as any);

      await service.calculateForDeveloper(developerId, periodStart, periodEnd);

      expect(repository.upsertSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          pullRequestsOpened: 0,
          pullRequestsMerged: 0,
          pullRequestsClosed: 0,
          reviewsGiven: 0,
          reviewsReceived: 0,
          activeRepositories: [],
          repoFocus: {},
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // defaultPeriod() static helper
  // -------------------------------------------------------------------------

  describe('defaultPeriod()', () => {
    it('returns a window with periodEnd approximately now and a 30-day span', () => {
      const before = new Date();
      const { periodStart, periodEnd } = MetricsService.defaultPeriod();
      const after = new Date();

      expect(periodEnd.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(periodEnd.getTime()).toBeLessThanOrEqual(after.getTime());

      const diffDays = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(30, 0);
    });
  });
});
