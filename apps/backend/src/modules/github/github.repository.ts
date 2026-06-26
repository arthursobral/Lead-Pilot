import { Injectable } from '@nestjs/common';
import type { PullRequest, PullRequestReview, Prisma, SyncedRepository } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { NormalizedPrState, NormalizedReviewState } from './github.types';

// =============================================================================
// Input types
// =============================================================================

/**
 * All data needed to upsert a PullRequest row and its TimelineEntry.
 * The developerId here is the Prisma-side ID (cuid), not the GitHub numeric ID.
 * GithubService resolves githubId -> Prisma ID before calling the repository.
 */
export interface UpsertPullRequestData {
  githubNodeId: string;
  number: number;
  title: string;
  body: string | null;
  state: NormalizedPrState;
  draft: boolean;
  url: string;
  repositoryName: string;
  repositoryFullName: string;
  developerId: string;
  githubCreatedAt: Date;
  githubUpdatedAt: Date;
  mergedAt: Date | null;
  closedAt: Date | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: string[];
  /** Pre-computed display text for the TimelineEntry. Built by GithubService. */
  timelineSummary: string;
}

/**
 * All data needed to upsert a PullRequestReview row and its TimelineEntry.
 * pullRequestId is the Prisma-side ID of the parent PullRequest.
 */
export interface UpsertReviewData {
  githubNodeId: string;
  pullRequestId: string;
  developerId: string;
  state: NormalizedReviewState;
  body: string | null;
  submittedAt: Date;
  /** Pre-computed display text for the TimelineEntry. Built by GithubService. */
  timelineSummary: string;
}

export interface UpsertSyncedRepositoryData {
  fullName: string;
  githubNodeId: string;
  defaultBranch: string;
}

// =============================================================================
// Repository
// =============================================================================

/**
 * GithubRepository owns all Prisma queries for the GitHub sync domain:
 * SyncedRepository, PullRequest, PullRequestReview, and the TimelineEntry
 * rows that derive from them.
 *
 * Rules (same as DevelopersRepository):
 *   - No business logic. No NotFoundException. No logging.
 *   - Return Prisma models. The service decides what to do with them.
 *   - Use $transaction wherever two writes must be atomic.
 *
 * Idempotency contract:
 *   - upsertPullRequest keyed on githubNodeId
 *   - upsertReview      keyed on githubNodeId
 *   - TimelineEntry created only if none exists for that source FK
 *   - SyncedRepository  keyed on fullName
 * Running any method twice with the same data leaves the DB unchanged.
 */
@Injectable()
export class GithubRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // SyncedRepository
  // ---------------------------------------------------------------------------

  /**
   * Register or update a repository for sync.
   * Creates the row on first call; updates githubNodeId and defaultBranch
   * on subsequent calls (in case the default branch changes).
   */
  async upsertSyncedRepository(
    data: UpsertSyncedRepositoryData,
  ): Promise<SyncedRepository> {
    return this.prisma.syncedRepository.upsert({
      where: { fullName: data.fullName },
      create: {
        fullName: data.fullName,
        githubNodeId: data.githubNodeId,
        defaultBranch: data.defaultBranch,
      },
      update: {
        githubNodeId: data.githubNodeId,
        defaultBranch: data.defaultBranch,
      },
    });
  }

  /**
   * Stamp the lastSyncedAt timestamp after a successful sync completes.
   * Called by GithubService after all pages have been processed.
   */
  async updateLastSyncedAt(
    fullName: string,
    lastSyncedAt: Date,
  ): Promise<void> {
    await this.prisma.syncedRepository.update({
      where: { fullName },
      data: { lastSyncedAt },
    });
  }

  // ---------------------------------------------------------------------------
  // Pull Requests
  // ---------------------------------------------------------------------------

  /**
   * Upsert a PullRequest and atomically upsert its TimelineEntry.
   *
   * Uses $transaction so both writes succeed or both roll back.
   *
   * occurredAt strategy:
   *   - MERGED PRs: mergedAt (when the contribution landed, not when it opened)
   *   - All others: githubCreatedAt
   *
   * Re-sync behaviour:
   *   - First sync: create the TimelineEntry.
   *   - Subsequent syncs: update summary and occurredAt if they differ.
   *     This handles the OPEN -> MERGED transition, where the summary changes
   *     from "Opened PR #42: ..." to "Merged PR #42: ..." and the date shifts
   *     from the open date to the merge date.
   *
   * state is stored as-is from NormalizedPrState ('OPEN'|'CLOSED'|'MERGED')
   * which maps directly to the PullRequestState Prisma enum values.
   */
  async upsertPullRequest(
    data: UpsertPullRequestData,
  ): Promise<PullRequest> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const pr = await tx.pullRequest.upsert({
        where: { githubNodeId: data.githubNodeId },
        create: {
          githubNodeId: data.githubNodeId,
          number: data.number,
          title: data.title,
          body: data.body,
          state: data.state,
          draft: data.draft,
          url: data.url,
          repositoryName: data.repositoryName,
          repositoryFullName: data.repositoryFullName,
          developerId: data.developerId,
          githubCreatedAt: data.githubCreatedAt,
          githubUpdatedAt: data.githubUpdatedAt,
          mergedAt: data.mergedAt,
          closedAt: data.closedAt,
          additions: data.additions,
          deletions: data.deletions,
          changedFiles: data.changedFiles,
          labels: data.labels,
        },
        update: {
          // Mutable fields that may change between syncs
          title: data.title,
          body: data.body,
          state: data.state,
          draft: data.draft,
          githubUpdatedAt: data.githubUpdatedAt,
          mergedAt: data.mergedAt,
          closedAt: data.closedAt,
          additions: data.additions,
          deletions: data.deletions,
          changedFiles: data.changedFiles,
          labels: data.labels,
        },
      });

      // Use mergedAt for merged PRs so the timeline reflects when the
      // contribution actually landed, not when the PR was opened.
      const occurredAt = data.mergedAt ?? data.githubCreatedAt;

      const existingEntry = await tx.timelineEntry.findFirst({
        where: { pullRequestId: pr.id, developerId: data.developerId },
        select: { id: true, summary: true, occurredAt: true },
      });

      if (!existingEntry) {
        await tx.timelineEntry.create({
          data: {
            developerId: data.developerId,
            type: 'SIGNAL',
            summary: data.timelineSummary,
            occurredAt,
            pullRequestId: pr.id,
          },
        });
      } else if (
        existingEntry.summary !== data.timelineSummary ||
        existingEntry.occurredAt.getTime() !== occurredAt.getTime()
      ) {
        // Update when the PR was merged (summary and/or date changed).
        await tx.timelineEntry.update({
          where: { id: existingEntry.id },
          data: { summary: data.timelineSummary, occurredAt },
        });
      }

      return pr;
    });
  }

  /**
   * Look up a PullRequest by its GitHub node ID.
   * Used by GithubService to resolve the Prisma ID needed for FK on reviews.
   */
  async findByGithubNodeId(githubNodeId: string): Promise<PullRequest | null> {
    return this.prisma.pullRequest.findUnique({
      where: { githubNodeId },
    });
  }

  /**
   * Batch look up pull requests by a list of GitHub node IDs.
   *
   * Replaces N individual findByGithubNodeId calls with a single query.
   * Returns only the id and githubNodeId fields -- callers only need these
   * to build the FK map used when persisting reviews.
   *
   * Safe with empty input: returns [] immediately without hitting the DB.
   */
  async findManyByGithubNodeIds(
    githubNodeIds: string[],
  ): Promise<Pick<PullRequest, 'id' | 'githubNodeId'>[]> {
    if (githubNodeIds.length === 0) return [];
    return this.prisma.pullRequest.findMany({
      where: { githubNodeId: { in: githubNodeIds } },
      select: { id: true, githubNodeId: true },
    });
  }

  // ---------------------------------------------------------------------------
  // Reviews
  // ---------------------------------------------------------------------------

  /**
   * Upsert a PullRequestReview and atomically create a TimelineEntry for
   * the reviewer.
   *
   * TimelineEntry is only created if none already exists for this
   * (pullRequestReviewId, developerId) pair. PENDING reviews must be
   * filtered out before calling this method (GithubMapper handles that).
   */
  async upsertReview(data: UpsertReviewData): Promise<PullRequestReview> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const review = await tx.pullRequestReview.upsert({
        where: { githubNodeId: data.githubNodeId },
        create: {
          githubNodeId: data.githubNodeId,
          pullRequestId: data.pullRequestId,
          developerId: data.developerId,
          state: data.state,
          body: data.body,
          submittedAt: data.submittedAt,
        },
        update: {
          // State and body can change (e.g. dismissed review)
          state: data.state,
          body: data.body,
          submittedAt: data.submittedAt,
        },
      });

      // Create a TimelineEntry for the reviewer only on first sync.
      const existingEntry = await tx.timelineEntry.findFirst({
        where: {
          pullRequestReviewId: review.id,
          developerId: data.developerId,
        },
      });

      if (!existingEntry) {
        await tx.timelineEntry.create({
          data: {
            developerId: data.developerId,
            type: 'SIGNAL',
            summary: data.timelineSummary,
            occurredAt: data.submittedAt,
            pullRequestReviewId: review.id,
          },
        });
      }

      return review;
    });
  }

  // ---------------------------------------------------------------------------
  // Developer lookup (used to trigger metrics jobs after sync)
  // ---------------------------------------------------------------------------

  /**
   * Return distinct Prisma developer IDs for all authors who have at least
   * one PR in the given repository.
   *
   * Called by GithubSyncProcessor after a sync completes to determine which
   * developers need a metrics recalculation. One batch query instead of
   * collecting IDs inline during the sync loop.
   */
  async findDeveloperIdsByRepo(repositoryFullName: string): Promise<string[]> {
    const rows = await this.prisma.pullRequest.findMany({
      where: { repositoryFullName },
      select: { developerId: true },
      distinct: ['developerId'],
    });
    return rows.map((r) => r.developerId);
  }
}
