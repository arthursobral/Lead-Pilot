import { Test, TestingModule } from '@nestjs/testing';
import { TimelineService } from '../timeline.service';
import { TimelineRepository } from '../timeline.repository';
import type { PaginatedTimeline, RebuildResult } from '../types/timeline.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal TimelineEntryWithSource for tests.
 * Uses plain string literals for enum values to avoid importing @prisma/client.
 */
function makeEntry(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'entry-1',
    developerId: 'dev-1',
    type: 'SIGNAL' as any,
    summary: 'Merged PR #1: Fix bug',
    occurredAt: new Date('2026-06-01T12:00:00.000Z'),
    createdAt: new Date('2026-06-01T12:05:00.000Z'),
    pullRequestId: 'pr-1',
    pullRequestReviewId: null,
    observationId: null,
    insightId: null,
    weeklyReportId: null,
    pullRequest: {
      id: 'pr-1',
      number: 1,
      title: 'Fix bug',
      state: 'MERGED',
      url: 'https://github.com/org/repo/pull/1',
      repositoryFullName: 'org/repo',
      additions: 10,
      deletions: 5,
      mergedAt: new Date('2026-06-01T11:00:00.000Z'),
      githubCreatedAt: new Date('2026-05-30T09:00:00.000Z'),
    },
    pullRequestReview: null,
    observation: null,
    ...overrides,
  };
}

function makePaginatedResult(
  entries: ReturnType<typeof makeEntry>[] = [makeEntry()],
  overrides: Partial<PaginatedTimeline> = {},
): PaginatedTimeline {
  return {
    data: entries as any,
    total: entries.length,
    page: 1,
    limit: 20,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

type MockTimelineRepository = {
  findByDeveloper: jest.Mock;
  createEntry: jest.Mock;
  rebuild: jest.Mock;
};

function makeMockRepository(): MockTimelineRepository {
  return {
    findByDeveloper: jest.fn(),
    createEntry: jest.fn(),
    rebuild: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TimelineService', () => {
  let service: TimelineService;
  let repository: MockTimelineRepository;

  beforeEach(async () => {
    repository = makeMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimelineService,
        { provide: TimelineRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<TimelineService>(TimelineService);
  });

  // -------------------------------------------------------------------------
  // getTimeline -- returns PaginatedTimelineResponseDto (mapped)
  // -------------------------------------------------------------------------

  describe('getTimeline', () => {
    it('returns a mapped DTO (not the raw repository object)', async () => {
      repository.findByDeveloper.mockResolvedValue(makePaginatedResult());

      const result = await service.getTimeline('dev-1', {});

      // The service applies the mapper; result is a DTO, not the raw paginated object
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('maps entries to DTOs -- source is derived from FK', async () => {
      repository.findByDeveloper.mockResolvedValue(makePaginatedResult([makeEntry()]));

      const result = await service.getTimeline('dev-1', {});

      const dto = result.data[0];
      expect(dto.source).toBe('pull_request');
      expect(typeof dto.occurredAt).toBe('string');
      expect(typeof dto.createdAt).toBe('string');
    });

    it('applies default page=1 and limit=20 when not provided', async () => {
      repository.findByDeveloper.mockResolvedValue(makePaginatedResult());

      await service.getTimeline('dev-1', {});

      const call = repository.findByDeveloper.mock.calls[0][1];
      expect(call.page).toBe(1);
      expect(call.limit).toBe(20);
    });

    it('forwards explicit page and limit to repository', async () => {
      repository.findByDeveloper.mockResolvedValue(makePaginatedResult());

      await service.getTimeline('dev-1', { page: 3, limit: 50 });

      const call = repository.findByDeveloper.mock.calls[0][1];
      expect(call.page).toBe(3);
      expect(call.limit).toBe(50);
    });

    it('converts from/to ISO strings to Date objects', async () => {
      repository.findByDeveloper.mockResolvedValue(makePaginatedResult());

      await service.getTimeline('dev-1', {
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-06-30T23:59:59.999Z',
      });

      const call = repository.findByDeveloper.mock.calls[0][1];
      expect(call.from).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(call.to).toEqual(new Date('2026-06-30T23:59:59.999Z'));
    });

    it('passes undefined for from/to when not provided', async () => {
      repository.findByDeveloper.mockResolvedValue(makePaginatedResult());

      await service.getTimeline('dev-1', {});

      const call = repository.findByDeveloper.mock.calls[0][1];
      expect(call.from).toBeUndefined();
      expect(call.to).toBeUndefined();
    });

    it('passes type filter to repository', async () => {
      repository.findByDeveloper.mockResolvedValue(makePaginatedResult());

      await service.getTimeline('dev-1', { type: 'SIGNAL' as any });

      const call = repository.findByDeveloper.mock.calls[0][1];
      expect(call.type).toBe('SIGNAL');
    });

    it('passes source filter to repository', async () => {
      repository.findByDeveloper.mockResolvedValue(makePaginatedResult());

      await service.getTimeline('dev-1', { source: 'observation' });

      const call = repository.findByDeveloper.mock.calls[0][1];
      expect(call.source).toBe('observation');
    });

    it('passes source=pull_request filter to repository', async () => {
      repository.findByDeveloper.mockResolvedValue(makePaginatedResult());

      await service.getTimeline('dev-1', { source: 'pull_request' });

      const call = repository.findByDeveloper.mock.calls[0][1];
      expect(call.source).toBe('pull_request');
    });

    it('returns empty result without throwing when developer has no entries', async () => {
      repository.findByDeveloper.mockResolvedValue(makePaginatedResult([], { total: 0 }));

      const result = await service.getTimeline('dev-1', {});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('returns entries in repository order (ordering is repository concern)', async () => {
      const entries = [
        makeEntry({ id: 'entry-2', pullRequestId: 'pr-2', occurredAt: new Date('2026-06-02T12:00:00.000Z'), createdAt: new Date('2026-06-02T12:05:00.000Z') }),
        makeEntry({ id: 'entry-1', pullRequestId: 'pr-1', occurredAt: new Date('2026-06-01T12:00:00.000Z'), createdAt: new Date('2026-06-01T12:05:00.000Z') }),
      ];
      repository.findByDeveloper.mockResolvedValue(makePaginatedResult(entries, { total: 2 }));

      const result = await service.getTimeline('dev-1', {});

      expect(result.data[0].id).toBe('entry-2');
      expect(result.data[1].id).toBe('entry-1');
    });
  });

  // -------------------------------------------------------------------------
  // createEntry
  // -------------------------------------------------------------------------

  describe('createEntry', () => {
    it('delegates to repository and returns the created entry', async () => {
      const created = { id: 'entry-new', developerId: 'dev-1', type: 'INSIGHT' } as any;
      repository.createEntry.mockResolvedValue(created);

      const data = {
        developerId: 'dev-1',
        type: 'INSIGHT' as any,
        summary: 'AI detected a growth pattern',
        occurredAt: new Date('2026-06-15'),
        insightId: 'insight-1',
      };

      const result = await service.createEntry(data);

      expect(result).toBe(created);
      expect(repository.createEntry).toHaveBeenCalledWith(data);
    });

    it('creates a SIGNAL entry for a PR source', async () => {
      const created = { id: 'entry-pr', developerId: 'dev-1', type: 'SIGNAL' } as any;
      repository.createEntry.mockResolvedValue(created);

      const data = {
        developerId: 'dev-1',
        type: 'SIGNAL' as any,
        summary: 'Merged PR #5: Add feature',
        occurredAt: new Date('2026-06-10'),
        pullRequestId: 'pr-5',
      };

      const result = await service.createEntry(data);

      expect(result).toBe(created);
      expect(repository.createEntry).toHaveBeenCalledWith(data);
    });
  });

  // -------------------------------------------------------------------------
  // rebuild
  // -------------------------------------------------------------------------

  describe('rebuild', () => {
    it('returns rebuild result from repository', async () => {
      const rebuildResult: RebuildResult = {
        developerId: 'dev-1',
        entriesDeleted: 5,
        entriesCreated: 8,
      };
      repository.rebuild.mockResolvedValue(rebuildResult);

      const result = await service.rebuild('dev-1');

      expect(result).toEqual(rebuildResult);
      expect(repository.rebuild).toHaveBeenCalledWith('dev-1');
    });

    it('returns zero counts for a developer with no history', async () => {
      const emptyResult: RebuildResult = {
        developerId: 'dev-new',
        entriesDeleted: 0,
        entriesCreated: 0,
      };
      repository.rebuild.mockResolvedValue(emptyResult);

      const result = await service.rebuild('dev-new');

      expect(result.entriesDeleted).toBe(0);
      expect(result.entriesCreated).toBe(0);
    });

    it('propagates errors from repository', async () => {
      repository.rebuild.mockRejectedValue(new Error('DB timeout'));

      await expect(service.rebuild('dev-1')).rejects.toThrow('DB timeout');
    });
  });
});
