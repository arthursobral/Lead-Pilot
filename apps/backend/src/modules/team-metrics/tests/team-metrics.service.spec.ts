import { Test, TestingModule } from '@nestjs/testing';
import { TeamMetricsService } from '../team-metrics.service';
import { TeamMetricsRepository } from '../team-metrics.repository';
import type { DeveloperSnapshotInput } from '../team-metrics.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnapshot(overrides: Partial<DeveloperSnapshotInput> = {}): DeveloperSnapshotInput {
  return {
    developerId: 'dev-1',
    pullRequestsOpened: 0,
    pullRequestsMerged: 0,
    pullRequestsClosed: 0,
    averageMergeTimeHours: null,
    reviewsGiven: 0,
    reviewsReceived: 0,
    activeRepositories: [],
    repoFocus: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TeamMetricsService', () => {
  let service: TeamMetricsService;
  let repository: jest.Mocked<TeamMetricsRepository>;

  beforeEach(async () => {
    const mockRepository = {
      findDeveloperIdsByTeamLead: jest.fn(),
      fetchDeveloperSnapshots: jest.fn(),
      upsertTeamSnapshot: jest.fn(),
      findLatestTeamSnapshot: jest.fn(),
      findTeamSnapshotForPeriod: jest.fn(),
    } as unknown as jest.Mocked<TeamMetricsRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamMetricsService,
        { provide: TeamMetricsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<TeamMetricsService>(TeamMetricsService);
    repository = module.get(TeamMetricsRepository);
  });

  // -------------------------------------------------------------------------
  // aggregate() -- pure function tests
  // -------------------------------------------------------------------------

  describe('aggregate()', () => {
    it('returns all zeros when given an empty array', () => {
      const result = service.aggregate([]);
      expect(result.developerCount).toBe(0);
      expect(result.totalPrsOpened).toBe(0);
      expect(result.totalPrsMerged).toBe(0);
      expect(result.totalPrsClosed).toBe(0);
      expect(result.averageMergeTimeHours).toBeNull();
      expect(result.totalReviewsGiven).toBe(0);
      expect(result.totalReviewsReceived).toBe(0);
      expect(result.activeRepositories).toEqual([]);
      expect(result.repoFocus).toEqual({});
    });

    it('sums PR counts across developers', () => {
      const snapshots = [
        makeSnapshot({ pullRequestsOpened: 3, pullRequestsMerged: 2, pullRequestsClosed: 1 }),
        makeSnapshot({ pullRequestsOpened: 5, pullRequestsMerged: 4, pullRequestsClosed: 2 }),
      ];
      const result = service.aggregate(snapshots);
      expect(result.totalPrsOpened).toBe(8);
      expect(result.totalPrsMerged).toBe(6);
      expect(result.totalPrsClosed).toBe(3);
    });

    it('sums review activity across developers', () => {
      const snapshots = [
        makeSnapshot({ reviewsGiven: 10, reviewsReceived: 4 }),
        makeSnapshot({ reviewsGiven: 6, reviewsReceived: 8 }),
      ];
      const result = service.aggregate(snapshots);
      expect(result.totalReviewsGiven).toBe(16);
      expect(result.totalReviewsReceived).toBe(12);
    });

    it('computes weighted average merge time (not simple average)', () => {
      // dev A: 10 PRs at 2h avg => contributes 20h to numerator
      // dev B:  1 PR at 100h avg => contributes 100h to numerator
      // simple avg would be (2 + 100) / 2 = 51h -- WRONG
      // weighted avg = (10*2 + 1*100) / (10+1) = 120/11 ≈ 10.909h -- CORRECT
      const snapshots = [
        makeSnapshot({ pullRequestsMerged: 10, averageMergeTimeHours: 2 }),
        makeSnapshot({ pullRequestsMerged: 1, averageMergeTimeHours: 100 }),
      ];
      const result = service.aggregate(snapshots);
      expect(result.averageMergeTimeHours).toBeCloseTo(120 / 11, 5);
    });

    it('excludes developers with null averageMergeTimeHours from the weighted average', () => {
      // dev A has no merged PRs (null avg); dev B has 4 PRs at 10h avg
      const snapshots = [
        makeSnapshot({ pullRequestsMerged: 0, averageMergeTimeHours: null }),
        makeSnapshot({ pullRequestsMerged: 4, averageMergeTimeHours: 10 }),
      ];
      expect(service.aggregate(snapshots).averageMergeTimeHours).toBe(10);
    });

    it('returns null averageMergeTimeHours when no developer had merged PRs', () => {
      const snapshots = [
        makeSnapshot({ pullRequestsMerged: 0, averageMergeTimeHours: null }),
        makeSnapshot({ pullRequestsMerged: 0, averageMergeTimeHours: null }),
      ];
      expect(service.aggregate(snapshots).averageMergeTimeHours).toBeNull();
    });

    it('deduplicates activeRepositories across all developers', () => {
      const snapshots = [
        makeSnapshot({ activeRepositories: ['org/a', 'org/b'] }),
        makeSnapshot({ activeRepositories: ['org/b', 'org/c'] }), // org/b is shared
      ];
      const repos = service.aggregate(snapshots).activeRepositories.sort();
      expect(repos).toEqual(['org/a', 'org/b', 'org/c']);
    });

    it('sums repoFocus counts across developers', () => {
      const snapshots = [
        makeSnapshot({ repoFocus: { 'org/payments': 3, 'org/api': 2 } }),
        makeSnapshot({ repoFocus: { 'org/payments': 5, 'org/frontend': 1 } }),
      ];
      const focus = service.aggregate(snapshots).repoFocus;
      expect(focus['org/payments']).toBe(8);
      expect(focus['org/api']).toBe(2);
      expect(focus['org/frontend']).toBe(1);
    });

    it('sorts aggregated repoFocus descending by count', () => {
      const snapshots = [
        makeSnapshot({ repoFocus: { 'org/low': 1, 'org/high': 5, 'org/mid': 3 } }),
        makeSnapshot({ repoFocus: { 'org/high': 2 } }), // org/high total: 7
      ];
      const keys = Object.keys(service.aggregate(snapshots).repoFocus);
      expect(keys).toEqual(['org/high', 'org/mid', 'org/low']);
    });

    it('sets developerCount to the number of input snapshots', () => {
      const snapshots = [makeSnapshot(), makeSnapshot(), makeSnapshot()];
      expect(service.aggregate(snapshots).developerCount).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // calculateForTeam() -- integration with repository
  // -------------------------------------------------------------------------

  describe('calculateForTeam()', () => {
    const teamLeadId = 'tl-xyz';
    const periodStart = new Date('2026-05-25T00:00:00Z');
    const periodEnd = new Date('2026-06-24T00:00:00Z');

    it('resolves developer IDs, fetches snapshots, aggregates, and upserts', async () => {
      const devIds = ['dev-a', 'dev-b'];
      const snapshots = [
        makeSnapshot({ developerId: 'dev-a', pullRequestsMerged: 3 }),
        makeSnapshot({ developerId: 'dev-b', pullRequestsMerged: 1 }),
      ];
      const fakeTeamSnapshot = { id: 'ts-1', developerCount: 2 } as any;

      repository.findDeveloperIdsByTeamLead.mockResolvedValue(devIds);
      repository.fetchDeveloperSnapshots.mockResolvedValue(snapshots);
      repository.upsertTeamSnapshot.mockResolvedValue(fakeTeamSnapshot);

      const result = await service.calculateForTeam(teamLeadId, periodStart, periodEnd);

      expect(repository.findDeveloperIdsByTeamLead).toHaveBeenCalledWith(teamLeadId);
      expect(repository.fetchDeveloperSnapshots).toHaveBeenCalledWith(
        devIds, periodStart, periodEnd,
      );
      expect(repository.upsertTeamSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          teamLeadId,
          periodStart,
          periodEnd,
          developerCount: 2,
          totalPrsMerged: 4,
        }),
      );
      expect(result).toBe(fakeTeamSnapshot);
    });

    it('produces an all-zero snapshot when no developer snapshots exist', async () => {
      repository.findDeveloperIdsByTeamLead.mockResolvedValue(['dev-a']);
      repository.fetchDeveloperSnapshots.mockResolvedValue([]);
      repository.upsertTeamSnapshot.mockResolvedValue({ id: 'ts-2', developerCount: 0 } as any);

      await service.calculateForTeam(teamLeadId, periodStart, periodEnd);

      expect(repository.upsertTeamSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          developerCount: 0,
          totalPrsOpened: 0,
          totalPrsMerged: 0,
          averageMergeTimeHours: null,
          repoFocus: {},
        }),
      );
    });
  });
});
