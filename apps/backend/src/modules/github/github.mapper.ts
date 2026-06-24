import { Injectable } from '@nestjs/common';

import type {
  GithubApiPullRequest,
  GithubApiReview,
  GithubApiUser,
  NormalizedGithubUser,
  NormalizedPrState,
  NormalizedPullRequest,
  NormalizedReview,
  NormalizedReviewState,
} from './github.types';

/**
 * GithubMapper converts raw GitHub API response shapes into normalized
 * internal domain types.
 *
 * Rules:
 *   - Pure transformation - no I/O, no side effects, no Prisma.
 *   - Every method is synchronous.
 *   - Returns null rather than throwing for data that should be skipped
 *     (e.g. PENDING reviews, deleted-user PRs where the caller decides).
 *
 * Injectable so it participates in NestJS DI and can be mocked in tests.
 * Methods are also independently testable without the DI container.
 */
@Injectable()
export class GithubMapper {
  // ---------------------------------------------------------------------------
  // User
  // ---------------------------------------------------------------------------

  /**
   * Maps a raw GitHub user object to NormalizedGithubUser.
   *
   * The GitHub list endpoints (pulls, reviews) do not include the display
   * name - only the user detail endpoint does. Fetching that for every unique
   * author would cost one extra API call per person which is too expensive
   * for bulk sync. Login is used as the name fallback; it can be refined later
   * when we add individual developer profile enrichment.
   */
  mapUser(raw: GithubApiUser): NormalizedGithubUser {
    return {
      githubId: String(raw.id),
      githubLogin: raw.login,
      name: raw.login,
      avatarUrl: raw.avatar_url ?? null,
      isBot: raw.type === 'Bot',
    };
  }

  // ---------------------------------------------------------------------------
  // Pull Request
  // ---------------------------------------------------------------------------

  /**
   * Derive the PR state from the combination of `state` and `merged_at`.
   *
   * GitHub uses two fields rather than three distinct states:
   *   - Open:   state='open',   merged_at=null
   *   - Merged: state='closed', merged_at=<timestamp>
   *   - Closed: state='closed', merged_at=null
   *
   * This is checked on every upsert so a PR that moves from OPEN → MERGED
   * updates correctly without requiring a delete + re-insert.
   */
  private mapPrState(raw: GithubApiPullRequest): NormalizedPrState {
    if (raw.merged_at !== null) return 'MERGED';
    if (raw.state === 'open') return 'OPEN';
    return 'CLOSED';
  }

  /**
   * Maps a raw GitHub pull request to NormalizedPullRequest.
   *
   * Converts snake_case API fields to camelCase internal fields, parses
   * ISO 8601 timestamps into Date objects, and reduces labels to name-only
   * string arrays (colors and IDs are not stored).
   */
  mapPullRequest(raw: GithubApiPullRequest): NormalizedPullRequest {
    return {
      githubNodeId: raw.node_id,
      number: raw.number,
      title: raw.title,
      body: raw.body,
      state: this.mapPrState(raw),
      draft: raw.draft,
      url: raw.html_url,
      repositoryName: raw.base.repo.name,
      repositoryFullName: raw.base.repo.full_name,
      author: raw.user ? this.mapUser(raw.user) : null,
      githubCreatedAt: new Date(raw.created_at),
      githubUpdatedAt: new Date(raw.updated_at),
      mergedAt: raw.merged_at ? new Date(raw.merged_at) : null,
      closedAt: raw.closed_at ? new Date(raw.closed_at) : null,
      additions: raw.additions,
      deletions: raw.deletions,
      changedFiles: raw.changed_files,
      labels: raw.labels.map((l) => l.name),
    };
  }

  // ---------------------------------------------------------------------------
  // Review
  // ---------------------------------------------------------------------------

  /**
   * Maps a raw GitHub review to NormalizedReview.
   *
   * Returns null for PENDING reviews. PENDING means the review was started
   * in the GitHub UI but not yet submitted - it has no submitted_at and
   * no meaningful state signal. The caller (GithubService) filters nulls.
   *
   * @param prGithubNodeId The node_id of the parent pull request.
   *   Not present in the review response body, so it must be supplied by
   *   the caller who already has the PR in scope.
   */
  mapReview(
    raw: GithubApiReview,
    prGithubNodeId: string,
  ): NormalizedReview | null {
    if (raw.state === 'PENDING') {
      return null;
    }

    return {
      githubNodeId: raw.node_id,
      prGithubNodeId,
      state: raw.state as NormalizedReviewState,
      // Some COMMENTED reviews have empty-string bodies rather than null.
      body: raw.body || null,
      submittedAt: new Date(raw.submitted_at),
      reviewer: raw.user ? this.mapUser(raw.user) : null,
    };
  }
}
