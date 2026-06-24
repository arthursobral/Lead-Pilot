import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { QUEUES } from '../../jobs/queues';
import { GithubService } from './github.service';
import { GithubRepository } from './github.repository';
import {
  GithubAuthError,
  GithubNotFoundError,
  GithubRateLimitError,
} from './github.errors';
import {
  GITHUB_SYNC_JOB,
  type GithubSyncJobPayload,
  type GithubSyncJobResult,
} from './github-sync.job';
import type { NormalizedPullRequest } from './github.types';

/**
 * GithubSyncProcessor
 *
 * BullMQ worker that handles github.syncRepository jobs.
 *
 * Flow for each job:
 *   1. upsertSyncedRepository -- register / refresh repo metadata
 *   2. Loop over all PR pages (sorted updated desc):
 *        a. persistPullRequests -- upsert developers + PRs + timeline entries
 *        b. For each saved PR: getReviewsForPr + persistReviews
 *   3. markSyncComplete -- stamp lastSyncedAt
 *
 * sinceDate handling:
 *   PRs are returned sorted by updatedAt desc. Once the oldest PR on a page
 *   is older than sinceDate, all subsequent pages will also be older, so the
 *   loop stops early. PRs on the cutoff page are filtered before persisting.
 *
 * Idempotency:
 *   All writes delegate to GithubService.persist* which use Prisma upsert
 *   keyed on githubNodeId. Running the same job twice is safe.
 *
 * Retry behaviour:
 *   BullMQ retries on any thrown error (3 attempts, exponential backoff).
 *   GithubAuthError and GithubNotFoundError are re-thrown immediately --
 *   retrying them will not help. GithubRateLimitError is also re-thrown
 *   so BullMQ delays the retry until the rate limit window resets.
 */
@Processor(QUEUES.GITHUB_SYNC)
export class GithubSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(GithubSyncProcessor.name);

  constructor(
    private readonly githubService: GithubService,
    private readonly githubRepository: GithubRepository,
  ) { super(); }

  async process(
    job: Job<GithubSyncJobPayload, GithubSyncJobResult>,
  ): Promise<GithubSyncJobResult> {
    if (job.name !== GITHUB_SYNC_JOB) {
      this.logger.warn(`Unknown job name "${job.name}" -- skipping`);
      return this.emptyResult('');
    }

    const { owner, repo, sinceDate } = job.data;
    const repositoryFullName = `${owner}/${repo}`;
    const since = sinceDate ? new Date(sinceDate) : null;

    this.logger.log(
      `[job:${job.id}] Starting sync: ${repositoryFullName}` +
        (since ? ` since=${sinceDate}` : ' (full sync)'),
    );

    try {
      // ------------------------------------------------------------------
      // Step 1: register / refresh synced repository row
      // ------------------------------------------------------------------
      await this.githubService.upsertSyncedRepository(repositoryFullName);

      // Accumulators
      let pagesProcessed = 0;
      let totalPrsSaved = 0;
      let totalBotSkipped = 0;
      let totalNullAuthorsSkipped = 0;
      let totalReviewsSaved = 0;
      let totalNullReviewersSkipped = 0;

      // ------------------------------------------------------------------
      // Step 2: page through all PRs
      // ------------------------------------------------------------------
      let page = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        // Rough progress: 10% setup, 10-90% pages, 100% done
        await job.updateProgress(Math.min(10 + pagesProcessed * 5, 85));

        this.logger.debug(
          `[job:${job.id}] Fetching ${repositoryFullName} page=${page}`,
        );

        const { items: prs, hasNextPage: nextPage } =
          await this.githubService.getPullRequestsPage(repositoryFullName, page);

        if (prs.length === 0) break;

        // sinceDate cutoff: if the oldest PR on this page is before sinceDate,
        // filter the page and stop -- no need to scan older pages.
        let prsToProcess = prs;
        let reachedCutoff = false;

        if (since) {
          const oldestOnPage = prs[prs.length - 1];
          if (oldestOnPage.githubUpdatedAt < since) {
            prsToProcess = prs.filter((pr) => pr.githubUpdatedAt >= since);
            reachedCutoff = true;
            this.logger.debug(
              `[job:${job.id}] sinceDate cutoff on page ${page}: ` +
                `keeping ${prsToProcess.length}/${prs.length} PRs`,
            );
          }
        }

        // Step 2a: persist PRs
        const prResult =
          await this.githubService.persistPullRequests(prsToProcess);
        totalPrsSaved += prResult.saved;
        totalBotSkipped += prResult.skippedBotAuthors;
        totalNullAuthorsSkipped += prResult.skippedNullAuthors;

        // Step 2b: resolve Prisma IDs needed as FK for reviews
        const prNodeIdToPrismaId = await this.buildPrNodeIdMap(
          prsToProcess.map((p) => p.githubNodeId),
        );

        // Step 2c: fetch + persist reviews for each saved PR
        for (const pr of prsToProcess) {
          if (!pr.author || pr.author.isBot) continue;
          const reviews = await this.githubService.getReviewsForPr(
            repositoryFullName,
            pr.number,
            pr.githubNodeId,
          );
          const reviewResult = await this.githubService.persistReviews(
            reviews,
            prNodeIdToPrismaId,
          );
          totalReviewsSaved += reviewResult.saved;
          totalNullReviewersSkipped += reviewResult.skippedNullReviewers;
        }

        pagesProcessed++;
        hasNextPage = nextPage && !reachedCutoff;
        page++;

        this.logger.log(
          `[job:${job.id}] Page ${pagesProcessed} done -- ` +
            `PRs saved: ${totalPrsSaved}, reviews saved: ${totalReviewsSaved}`,
        );
      }

      // ------------------------------------------------------------------
      // Step 3: stamp lastSyncedAt
      // ------------------------------------------------------------------
      await this.githubService.markSyncComplete(repositoryFullName);
      await job.updateProgress(100);

      const result: GithubSyncJobResult = {
        repositoryFullName,
        pagesProcessed,
        pullRequestsSaved: totalPrsSaved,
        reviewsSaved: totalReviewsSaved,
        skipped: {
          botAuthors: totalBotSkipped,
          nullAuthors: totalNullAuthorsSkipped,
          nullReviewers: totalNullReviewersSkipped,
        },
      };

      this.logger.log(
        `[job:${job.id}] Sync complete: ${repositoryFullName} -- ` +
          `${pagesProcessed} pages, ${totalPrsSaved} PRs, ${totalReviewsSaved} reviews`,
      );

      return result;
    } catch (error) {
      if (error instanceof GithubAuthError) {
        this.logger.error(
          `[job:${job.id}] Auth error for ${repositoryFullName}: ` +
            `check GITHUB_TOKEN is set and has the required scopes`,
        );
        throw error;
      }

      if (error instanceof GithubRateLimitError) {
        const resetMsg = error.resetAt
          ? ` (resets at ${error.resetAt.toISOString()})`
          : '';
        this.logger.warn(
          `[job:${job.id}] Rate limit hit for ${repositoryFullName}${resetMsg} -- BullMQ will retry`,
        );
        throw error;
      }

      if (error instanceof GithubNotFoundError) {
        this.logger.error(
          `[job:${job.id}] Repository not found: ${repositoryFullName}`,
        );
        throw error;
      }

      this.logger.error(
        `[job:${job.id}] Unexpected error syncing ${repositoryFullName}`,
        error,
      );
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Build a Map<githubNodeId, prismaId> using a single batch DB query.
   * Used to resolve parent PR Prisma IDs needed as FK for reviews.
   * One query regardless of how many PRs are on the page.
   */
  private async buildPrNodeIdMap(
    githubNodeIds: string[],
  ): Promise<Map<string, string>> {
    const rows =
      await this.githubRepository.findManyByGithubNodeIds(githubNodeIds);
    return new Map(rows.map((row) => [row.githubNodeId, row.id]));
  }

  private emptyResult(repositoryFullName: string): GithubSyncJobResult {
    return {
      repositoryFullName,
      pagesProcessed: 0,
      pullRequestsSaved: 0,
      reviewsSaved: 0,
      skipped: { botAuthors: 0, nullAuthors: 0, nullReviewers: 0 },
    };
  }
}
