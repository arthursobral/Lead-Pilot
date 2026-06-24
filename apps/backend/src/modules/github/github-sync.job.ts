/**
 * Job name and payload/result types for the GitHub sync background job.
 *
 * Imported by:
 *   - GithubSyncQueue   (producer -- enqueues jobs)
 *   - GithubSyncProcessor (consumer -- processes jobs)
 *   - Any future service that needs to trigger a sync
 */

/** Stable job name used in BullMQ queue.add() and @Process() matching. */
export const GITHUB_SYNC_JOB = 'github.syncRepository' as const;

// =============================================================================
// Job input
// =============================================================================

export interface GithubSyncJobPayload {
  /** GitHub org or user name (e.g. "DAv2-BBVA"). */
  owner: string;

  /** Repository name without the owner prefix (e.g. "bbvaNationalSP"). */
  repo: string;

  /**
   * ISO-8601 date string (e.g. "2024-01-01T00:00:00Z").
   *
   * When set, only PRs with updatedAt >= sinceDate are processed.
   * This enables incremental syncs: pass the lastSyncedAt from
   * SyncedRepository to avoid re-scanning the full PR history.
   *
   * Omit for a full sync (first run or manual re-sync).
   */
  sinceDate?: string;
}

// =============================================================================
// Job output
// =============================================================================

export interface GithubSyncJobResult {
  repositoryFullName: string;
  pagesProcessed: number;
  pullRequestsSaved: number;
  reviewsSaved: number;
  skipped: {
    botAuthors: number;
    nullAuthors: number;
    nullReviewers: number;
  };
}
