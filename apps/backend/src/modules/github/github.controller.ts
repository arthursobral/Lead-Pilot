import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubRepository } from './github.repository';
import { GithubSyncQueue } from './github-sync.queue';
import { SyncRepositoryDto } from './dto/sync-repository.dto';

/**
 * GithubController
 *
 * Production endpoints:
 *   POST /api/github/sync          -- enqueue a background sync job
 *   GET  /api/github/sync/:jobId   -- poll job status + result
 *
 * Smoke-test endpoints (remove before production):
 *   GET  /api/github/test/repo     -- verify token + repo access
 *   GET  /api/github/test/prs      -- fetch first page of PRs (no DB write)
 *   GET  /api/github/test/reviews  -- fetch reviews for one PR (no DB write)
 *   POST /api/github/test/persist  -- fetch page 1 + save PRs + reviews (no job)
 *   POST /api/github/test/sync     -- enqueue job via query params (shorthand)
 *   GET  /api/github/test/job      -- poll job by ?id= (shorthand)
 */
@Controller('github')
export class GithubController {
  constructor(
    private readonly githubService: GithubService,
    private readonly githubRepository: GithubRepository,
    private readonly githubSyncQueue: GithubSyncQueue,
  ) {}

  // ---------------------------------------------------------------------------
  // Production: sync endpoints
  // ---------------------------------------------------------------------------

  /**
   * Enqueue a background sync job for a GitHub repository.
   *
   * Uses enqueueUnique so multiple requests for the same repo do not create
   * duplicate jobs while one is already waiting or running.
   *
   * POST /api/github/sync
   * Body: { "owner": "DAv2-BBVA", "repo": "bbvaNationalSP", "sinceDate": "2024-01-01T00:00:00Z" }
   */
  @Post('sync')
  async triggerSync(@Body() dto: SyncRepositoryDto) {
    const jobId = await this.githubSyncQueue.enqueueUnique({
      owner: dto.owner,
      repo: dto.repo,
      sinceDate: dto.sinceDate,
    });

    return {
      jobId,
      repository: `${dto.owner}/${dto.repo}`,
      status: 'queued',
      statusUrl: `/api/github/sync/${jobId}`,
    };
  }

  /**
   * Poll the status and result of a previously enqueued sync job.
   *
   * Possible states: waiting, active, completed, failed, delayed, paused
   *
   * GET /api/github/sync/:jobId
   */
  @Get('sync/:jobId')
  async getSyncStatus(@Param('jobId') jobId: string) {
    const job = await this.githubSyncQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(
        `Job "${jobId}" not found. Completed jobs are kept for 100 runs then removed.`,
      );
    }

    const state = await job.getState();
    const progress = job.progress ?? 0;
    const result = job.returnvalue ?? null;
    const failedReason = job.failedReason ?? null;
    const attemptsMade = job.attemptsMade ?? 0;

    return {
      jobId,
      state,
      progress,
      attemptsMade,
      ...(result && { result }),
      ...(failedReason && { failedReason }),
    };
  }

  // ---------------------------------------------------------------------------
  // Smoke-test: fetch only (no DB writes)
  // ---------------------------------------------------------------------------

  @Get('test/repo')
  async testRepo(@Query('repo') repo: string) {
    if (!repo) throw new BadRequestException('repo query param required (e.g. ?repo=org/repo)');
    return this.githubService.getRepositoryInfo(repo);
  }

  @Get('test/prs')
  async testPrs(@Query('repo') repo: string) {
    if (!repo) throw new BadRequestException('repo query param required');
    const result = await this.githubService.getPullRequestsPage(repo, 1);
    return {
      count: result.items.length,
      hasNextPage: result.hasNextPage,
      first: result.items[0] ?? null,
    };
  }

  @Get('test/reviews')
  async testReviews(
    @Query('repo') repo: string,
    @Query('pr') pr: string,
    @Query('nodeId') nodeId: string,
  ) {
    if (!repo || !pr || !nodeId) {
      throw new BadRequestException('Required: ?repo=org/repo&pr=42&nodeId=PR_xxx');
    }
    return this.githubService.getReviewsForPr(repo, parseInt(pr, 10), nodeId);
  }

  // ---------------------------------------------------------------------------
  // Smoke-test: fetch + persist synchronously (page 1 only, no job queue)
  // ---------------------------------------------------------------------------

  @Post('test/persist')
  async testPersist(@Query('repo') repo: string) {
    if (!repo) throw new BadRequestException('repo query param required');

    await this.githubService.upsertSyncedRepository(repo);

    const { items: prs, hasNextPage } =
      await this.githubService.getPullRequestsPage(repo, 1);

    const prResult = await this.githubService.persistPullRequests(prs);

    const prNodeIdToPrismaId = new Map<string, string>();
    for (const pr of prs) {
      const row = await this.githubRepository.findByGithubNodeId(pr.githubNodeId);
      if (row) prNodeIdToPrismaId.set(pr.githubNodeId, row.id);
    }

    let totalReviewsSaved = 0;
    let totalReviewsSkipped = 0;
    for (const pr of prs) {
      if (!pr.author || pr.author.isBot) continue;
      const reviews = await this.githubService.getReviewsForPr(
        repo,
        pr.number,
        pr.githubNodeId,
      );
      const reviewResult = await this.githubService.persistReviews(
        reviews,
        prNodeIdToPrismaId,
      );
      totalReviewsSaved += reviewResult.saved;
      totalReviewsSkipped += reviewResult.skippedNullReviewers;
    }

    if (!hasNextPage) {
      await this.githubService.markSyncComplete(repo);
    }

    return {
      repository: repo,
      pullRequests: prResult,
      reviews: { saved: totalReviewsSaved, skippedNullReviewers: totalReviewsSkipped },
      hasNextPage,
      message: hasNextPage
        ? 'Page 1 persisted. Repo has more pages -- use POST /sync for a full sync.'
        : 'All PRs and reviews persisted successfully.',
    };
  }

  // ---------------------------------------------------------------------------
  // Smoke-test: enqueue via query params (shorthand for quick testing)
  // ---------------------------------------------------------------------------

  @Post('test/sync')
  async testSync(
    @Query('owner') owner: string,
    @Query('repo') repo: string,
    @Query('sinceDate') sinceDate?: string,
  ) {
    if (!owner || !repo) {
      throw new BadRequestException('Required: ?owner=ORG&repo=REPO');
    }

    const jobId = await this.githubSyncQueue.enqueueUnique({ owner, repo, sinceDate });
    return {
      jobId,
      message: `Sync job enqueued. Poll at: GET /api/github/sync/${jobId}`,
    };
  }

  @Get('test/job')
  async testJobStatus(@Query('id') id: string) {
    if (!id) throw new BadRequestException('id query param required');
    const job = await this.githubSyncQueue.getJob(id);
    if (!job) throw new BadRequestException(`Job ${id} not found`);
    const state = await job.getState();
    return { jobId: id, state, progress: job.progress, result: job.returnvalue ?? null };
  }
}
