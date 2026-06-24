import { Injectable, Logger } from '@nestjs/common';

import { DevelopersRepository } from '../developers/developers.repository';
import { GithubApiClient } from './github-api.client';
import { GithubMapper } from './github.mapper';
import { GithubRepository } from './github.repository';
import type {
  GithubPageResult,
  NormalizedPullRequest,
  NormalizedRepository,
  NormalizedReview,
} from './github.types';

// =============================================================================
// Result types returned by persist methods
// =============================================================================

export interface PersistPullRequestsResult {
  saved: number;
  skippedBotAuthors: number;
  skippedNullAuthors: number;
}

export interface PersistReviewsResult {
  saved: number;
  skippedNullReviewers: number;
}

/**
 * GithubService orchestrates GitHub data fetching AND persistence.
 *
 * Fetch methods (API -> normalized types):
 *   getRepositoryInfo    -> verify repo + normalize metadata
 *   getPullRequestsPage  -> fetch + normalize one page of PRs
 *   getReviewsForPr      -> fetch + normalize reviews for one PR
 *
 * Persist methods (normalized types -> database):
 *   upsertSyncedRepository  -> register/update SyncedRepository row
 *   persistPullRequests     -> upsert developers + PRs + timeline entries
 *   persistReviews          -> upsert reviewer developers + reviews + timeline entries
 *
 * The BullMQ sync processor (GithubSyncProcessor, next step) will call
 * fetch + persist in sequence for each page. Keeping them separate lets
 * the processor control retry granularity independently for API vs DB work.
 *
 * Business logic that lives here (not in the repository):
 *   - Summary string generation for TimelineEntry rows
 *   - Decision to skip bot / null authors
 *   - Resolving githubId -> Prisma ID before passing to the repository
 */
@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(
    private readonly apiClient: GithubApiClient,
    private readonly mapper: GithubMapper,
    private readonly githubRepository: GithubRepository,
    private readonly developersRepository: DevelopersRepository,
  ) {}

  // ---------------------------------------------------------------------------
  // Fetch methods (GitHub API -> normalized types)
  // ---------------------------------------------------------------------------

  async getRepositoryInfo(
    repositoryFullName: string,
  ): Promise<NormalizedRepository> {
    const raw = await this.apiClient.fetchRepository(repositoryFullName);
    return {
      githubNodeId: raw.node_id,
      name: raw.name,
      fullName: raw.full_name,
      defaultBranch: raw.default_branch,
    };
  }

  async getPullRequestsPage(
    repositoryFullName: string,
    page: number,
  ): Promise<GithubPageResult<NormalizedPullRequest>> {
    const raw = await this.apiClient.fetchPullRequestsPage(repositoryFullName, page);
    const items = raw.items.map((pr) => this.mapper.mapPullRequest(pr));
    this.logger.debug(
      `Fetched ${items.length} PRs for ${repositoryFullName} page=${page} hasNextPage=${raw.hasNextPage}`,
    );
    return { items, hasNextPage: raw.hasNextPage };
  }

  async getReviewsForPr(
    repositoryFullName: string,
    prNumber: number,
    prGithubNodeId: string,
  ): Promise<NormalizedReview[]> {
    const raw = await this.apiClient.fetchReviews(repositoryFullName, prNumber);
    const reviews = raw
      .map((r) => this.mapper.mapReview(r, prGithubNodeId))
      .filter((r): r is NormalizedReview => r !== null);
    if (raw.length !== reviews.length) {
      this.logger.debug(
        `Filtered ${raw.length - reviews.length} PENDING review(s) for ${repositoryFullName}#${prNumber}`,
      );
    }
    return reviews;
  }

  // ---------------------------------------------------------------------------
  // Persist methods (normalized types -> database)
  // ---------------------------------------------------------------------------

  /**
   * Register or update a repository entry in the synced_repositories table.
   * Called once at the start of a sync to verify the repo is accessible and
   * record its metadata.
   */
  async upsertSyncedRepository(repositoryFullName: string): Promise<void> {
    const info = await this.getRepositoryInfo(repositoryFullName);
    await this.githubRepository.upsertSyncedRepository({
      fullName: info.fullName,
      githubNodeId: info.githubNodeId,
      defaultBranch: info.defaultBranch,
    });
    this.logger.log(`Registered synced repository: ${repositoryFullName}`);
  }

  /**
   * Persist a page of normalized pull requests to the database.
   *
   * For each PR:
   *   1. Skip if author is null (deleted GitHub account) -- no FK to create.
   *   2. Skip if author is a bot -- bots are not tracked as Developer records.
   *      The PR itself is still saved in those cases once bot-author handling
   *      is added. For Phase 2 we skip bot-authored PRs entirely.
   *   3. Upsert the author as a Developer row (keyed on githubId).
   *   4. Upsert the PullRequest row (keyed on githubNodeId).
   *   5. Create a TimelineEntry for the author if one does not yet exist
   *      (handled atomically inside GithubRepository.upsertPullRequest).
   *
   * Returns counts for logging and verification.
   */
  async persistPullRequests(
    prs: NormalizedPullRequest[],
  ): Promise<PersistPullRequestsResult> {
    let saved = 0;
    let skippedBotAuthors = 0;
    let skippedNullAuthors = 0;

    for (const pr of prs) {
      if (!pr.author) {
        skippedNullAuthors++;
        this.logger.debug(`Skipping PR #${pr.number}: author account deleted`);
        continue;
      }

      if (pr.author.isBot) {
        skippedBotAuthors++;
        this.logger.debug(
          `Skipping PR #${pr.number}: bot author (${pr.author.githubLogin})`,
        );
        continue;
      }

      // Upsert author -> get stable Prisma ID for FK
      const developer = await this.developersRepository.upsertByGithubId({
        githubId: pr.author.githubId,
        githubLogin: pr.author.githubLogin,
        name: pr.author.name,
        avatarUrl: pr.author.avatarUrl,
      });

      // Build summary for the TimelineEntry (business logic stays in service)
      const rawTitle = pr.title.length > 72
        ? pr.title.slice(0, 69) + '...'
        : pr.title;
      const verb = pr.state === 'MERGED' ? 'Merged' : 'Opened';
      const timelineSummary = `${verb} PR #${pr.number}: ${rawTitle}`;

      await this.githubRepository.upsertPullRequest({
        githubNodeId: pr.githubNodeId,
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        draft: pr.draft,
        url: pr.url,
        repositoryName: pr.repositoryName,
        repositoryFullName: pr.repositoryFullName,
        developerId: developer.id,
        githubCreatedAt: pr.githubCreatedAt,
        githubUpdatedAt: pr.githubUpdatedAt,
        mergedAt: pr.mergedAt,
        closedAt: pr.closedAt,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changedFiles,
        labels: pr.labels,
        timelineSummary,
      });

      saved++;
    }

    this.logger.log(
      `Persisted PRs: saved=${saved} skippedBots=${skippedBotAuthors} skippedNullAuthors=${skippedNullAuthors}`,
    );
    return { saved, skippedBotAuthors, skippedNullAuthors };
  }

  /**
   * Persist normalized reviews to the database.
   *
   * For each review:
   *   1. Skip if reviewer is null (deleted account).
   *   2. Resolve the parent PullRequest Prisma ID via prGithubNodeId lookup.
   *      If the parent PR is not in the DB yet (sync order issue), skip and log.
   *   3. Upsert reviewer as Developer (keyed on githubId).
   *   4. Upsert PullRequestReview (keyed on githubNodeId).
   *   5. Create TimelineEntry for reviewer if not yet exists (atomic inside repo).
   *
   * @param reviews Normalized reviews from GithubService.getReviewsForPr()
   * @param prNodeIdToPrismaId Map of githubNodeId -> Prisma PR id.
   *   Built by the caller (sync processor) after persisting PRs.
   */
  async persistReviews(
    reviews: NormalizedReview[],
    prNodeIdToPrismaId: Map<string, string>,
  ): Promise<PersistReviewsResult> {
    let saved = 0;
    let skippedNullReviewers = 0;

    for (const review of reviews) {
      if (!review.reviewer) {
        skippedNullReviewers++;
        this.logger.debug(
          `Skipping review ${review.githubNodeId}: reviewer account deleted`,
        );
        continue;
      }

      const pullRequestId = prNodeIdToPrismaId.get(review.prGithubNodeId);
      if (!pullRequestId) {
        // PR was skipped (bot/null author) so we cannot store the review FK
        this.logger.debug(
          `Skipping review ${review.githubNodeId}: parent PR not in DB (prGithubNodeId=${review.prGithubNodeId})`,
        );
        continue;
      }

      const reviewer = await this.developersRepository.upsertByGithubId({
        githubId: review.reviewer.githubId,
        githubLogin: review.reviewer.githubLogin,
        name: review.reviewer.name,
        avatarUrl: review.reviewer.avatarUrl,
      });

      const stateLabel: Record<string, string> = {
        APPROVED: 'approved',
        CHANGES_REQUESTED: 'requested changes on',
        COMMENTED: 'commented on',
        DISMISSED: 'dismissed review on',
      };
      const action = stateLabel[review.state] ?? 'reviewed';
      const timelineSummary = `${reviewer.githubLogin} ${action} a PR`;

      await this.githubRepository.upsertReview({
        githubNodeId: review.githubNodeId,
        pullRequestId,
        developerId: reviewer.id,
        state: review.state,
        body: review.body,
        submittedAt: review.submittedAt,
        timelineSummary,
      });

      saved++;
    }

    this.logger.log(
      `Persisted reviews: saved=${saved} skippedNullReviewers=${skippedNullReviewers}`,
    );
    return { saved, skippedNullReviewers };
  }

  /**
   * Stamp lastSyncedAt on the SyncedRepository after a full sync completes.
   */
  async markSyncComplete(repositoryFullName: string): Promise<void> {
    await this.githubRepository.updateLastSyncedAt(
      repositoryFullName,
      new Date(),
    );
  }
}
