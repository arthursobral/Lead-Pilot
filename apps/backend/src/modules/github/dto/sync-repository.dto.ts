import { IsISO8601, IsOptional, IsString, Matches, MinLength } from 'class-validator';

/**
 * Body for POST /github/sync.
 *
 * Triggers a full or incremental background sync for one GitHub repository.
 * The actual sync runs in a BullMQ worker (GithubSyncProcessor) -- this
 * endpoint only enqueues the job and returns immediately.
 *
 * owner + repo map directly to GithubSyncJobPayload. sinceDate enables
 * incremental syncs: pass the lastSyncedAt from SyncedRepository to avoid
 * re-scanning the full PR history on every run.
 */
export class SyncRepositoryDto {
  /**
   * GitHub org or user name.
   * Examples: "DAv2-BBVA", "facebook", "microsoft"
   */
  @IsString()
  @MinLength(1)
  owner: string;

  /**
   * Repository name without the owner prefix.
   * Examples: "bbvaNationalSP", "react", "vscode"
   */
  @IsString()
  @MinLength(1)
  repo: string;

  /**
   * ISO-8601 date string. When provided, only PRs updated at or after
   * this date are synced. Omit for a full sync.
   * Example: "2024-01-01T00:00:00Z"
   */
  @IsISO8601()
  @IsOptional()
  sinceDate?: string;
}
