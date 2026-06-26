import { Test, TestingModule } from '@nestjs/testing';
import { GithubSyncProcessor } from '../github-sync.processor';
import { GithubService } from '../github.service';
import { GithubRepository } from '../github.repository';
import { MetricsCalculationQueue } from '../../metrics/metrics-calculation.queue';
import { GITHUB_SYNC_JOB } from '../github-sync.job';
import type { NormalizedPullRequest } from '../github.types';

function makeJob(overrides: { name?: string; data?: { owner: string; repo: string } } = {}) {
  return {
    id: 'job-1',
    name: GITHUB_SYNC_JOB,
    data: { owner: 'org', repo: 'repo' },
    updateProgress: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makePr(githubNodeId: string): NormalizedPullRequest {
  return {
    githubNodeId,
    number: 1,
    title: 'Test PR',
    body: null,
    state: 'MERGED',
    draft: false,
    url: 'https://github.com/org/repo/pull/1',
    repositoryName: 'repo',
    repositoryFullName: 'org/repo',
    author: { githubId: '12345', githubLogin: 'alice', name: 'Alice', avatarUrl: null, isBot: false },
    githubCreatedAt: new Date('2026-06-01T00:00:00Z'),
    githubUpdatedAt: new Date('2026-06-01T00:00:00Z'),
    mergedAt: new Date('2026-06-02T00:00:00Z'),
    closedAt: null,
    additions: 10,
    deletions: 5,
    changedFiles: 2,
    labels: [],
  };
}

describe('GithubSyncProcessor', () => {
  let processor: GithubSyncProcessor;
  let githubService: jest.Mocked<GithubService>;
  let githubRepository: jest.Mocked<GithubRepository>;
  let metricsCalculationQueue: jest.Mocked<MetricsCalculationQueue>;

  beforeEach(async () => {
    const mockService = {
      upsertSyncedRepository: jest.fn().mockResolvedValue({}),
      getPullRequestsPage: jest.fn().mockResolvedValue({ items: [], hasNextPage: false }),
      persistPullRequests: jest.fn().mockResolvedValue({ saved: 0, skippedBotAuthors: 0, skippedNullAuthors: 0 }),
      getReviewsForPr: jest.fn().mockResolvedValue([]),
      persistReviews: jest.fn().mockResolvedValue({ saved: 0, skippedNullReviewers: 0 }),
      markSyncComplete: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<GithubService>;

    const mockRepo = {
      findManyByGithubNodeIds: jest.fn().mockResolvedValue([]),
      findDeveloperIdsByRepo: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<GithubRepository>;

    const mockMetricsQueue = {
      enqueueForDeveloper: jest.fn().mockResolvedValue('metrics-job-1'),
    } as unknown as jest.Mocked<MetricsCalculationQueue>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubSyncProcessor,
        { provide: GithubService, useValue: mockService },
        { provide: GithubRepository, useValue: mockRepo },
        { provide: MetricsCalculationQueue, useValue: mockMetricsQueue },
      ],
    }).compile();

    processor = module.get<GithubSyncProcessor>(GithubSyncProcessor);
    githubService = module.get(GithubService);
    githubRepository = module.get(GithubRepository);
    metricsCalculationQueue = module.get(MetricsCalculationQueue);
  });

  // -------------------------------------------------------------------------
  // Batch query (buildPrNodeIdMap)
  // -------------------------------------------------------------------------

  it('calls findManyByGithubNodeIds once per page with all node IDs from that page', async () => {
    githubService.getPullRequestsPage.mockResolvedValueOnce({ items: [makePr('n1'), makePr('n2')], hasNextPage: false });
    githubRepository.findManyByGithubNodeIds.mockResolvedValue([
      { id: 'p1', githubNodeId: 'n1' },
      { id: 'p2', githubNodeId: 'n2' },
    ]);
    githubService.persistPullRequests.mockResolvedValue({ saved: 2, skippedBotAuthors: 0, skippedNullAuthors: 0 });

    await processor.process(makeJob() as any);

    expect(githubRepository.findManyByGithubNodeIds).toHaveBeenCalledTimes(1);
    expect(githubRepository.findManyByGithubNodeIds).toHaveBeenCalledWith(['n1', 'n2']);
  });

  it('skips findManyByGithubNodeIds when the PR page is empty', async () => {
    await processor.process(makeJob() as any);
    expect(githubRepository.findManyByGithubNodeIds).not.toHaveBeenCalled();
  });

  it('calls findManyByGithubNodeIds once per page across multiple pages', async () => {
    githubService.getPullRequestsPage
      .mockResolvedValueOnce({ items: [makePr('n1')], hasNextPage: true })
      .mockResolvedValueOnce({ items: [makePr('n2')], hasNextPage: false });
    githubRepository.findManyByGithubNodeIds.mockResolvedValue([]);
    githubService.persistPullRequests.mockResolvedValue({ saved: 1, skippedBotAuthors: 0, skippedNullAuthors: 0 });

    await processor.process(makeJob() as any);

    expect(githubRepository.findManyByGithubNodeIds).toHaveBeenCalledTimes(2);
    expect(githubRepository.findManyByGithubNodeIds).toHaveBeenNthCalledWith(1, ['n1']);
    expect(githubRepository.findManyByGithubNodeIds).toHaveBeenNthCalledWith(2, ['n2']);
  });

  // -------------------------------------------------------------------------
  // Metrics enqueue after sync
  // -------------------------------------------------------------------------

  it('enqueues a metrics job for each developer after sync completes', async () => {
    githubRepository.findDeveloperIdsByRepo.mockResolvedValue(['dev-a', 'dev-b']);

    await processor.process(makeJob() as any);

    expect(githubRepository.findDeveloperIdsByRepo).toHaveBeenCalledWith('org/repo');
    expect(metricsCalculationQueue.enqueueForDeveloper).toHaveBeenCalledTimes(2);
    expect(metricsCalculationQueue.enqueueForDeveloper).toHaveBeenCalledWith(
      expect.objectContaining({ developerId: 'dev-a' }),
    );
    expect(metricsCalculationQueue.enqueueForDeveloper).toHaveBeenCalledWith(
      expect.objectContaining({ developerId: 'dev-b' }),
    );
  });

  it('skips metrics enqueue when no developers are found in the repo', async () => {
    githubRepository.findDeveloperIdsByRepo.mockResolvedValue([]);
    await processor.process(makeJob() as any);
    expect(metricsCalculationQueue.enqueueForDeveloper).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Unknown job name guard
  // -------------------------------------------------------------------------

  it('returns an empty result and skips processing for unknown job names', async () => {
    const result = await processor.process(makeJob({ name: 'unknown.job' }) as any);
    expect(result.pagesProcessed).toBe(0);
    expect(githubService.getPullRequestsPage).not.toHaveBeenCalled();
  });
});
