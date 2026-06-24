/**
 * GitHub module type definitions.
 *
 * Two layers:
 *
 *   1. GithubApi* - raw shapes returned by the GitHub REST API v3.
 *      snake_case, optional nulls, exactly what the wire sends.
 *      Used only inside GithubApiClient and GithubMapper.
 *
 *   2. Normalized* - internal domain types returned by GithubMapper.
 *      camelCase, fully typed, Prisma-agnostic.
 *      This is the contract between GithubService and the repository layer.
 *      Importing @prisma/client here is intentionally avoided so the API
 *      client stays decoupled from the database layer.
 */

// =============================================================================
// Raw GitHub REST API shapes
// =============================================================================

export interface GithubApiUser {
  /** GitHub's stable numeric user ID. Never changes even if login changes. */
  id: number;
  login: string;
  avatar_url: string;
  /** 'Bot' accounts should not be stored as Developer records. */
  type: 'User' | 'Bot' | 'Organization';
}

export interface GithubApiLabel {
  id: number;
  name: string;
  color: string;
}

/**
 * Shape returned by GET /repos/{owner}/{repo}/pulls?state=all
 *
 * Note: additions, deletions, changed_files are only present on the
 * single-PR endpoint (GET /pulls/{number}), NOT on the list endpoint.
 * We fetch the list first and accept 0 for size fields - these are
 * populated on subsequent syncs that hit individual PR endpoints.
 * For Phase 2 we accept this trade-off to avoid N+1 API calls.
 */
export interface GithubApiPullRequest {
  id: number;
  node_id: string;
  number: number;
  title: string;
  body: string | null;
  /** 'open' | 'closed'. Merged PRs have state='closed' and merged_at set. */
  state: 'open' | 'closed';
  draft: boolean;
  html_url: string;
  /** Null when the author's account has been deleted. */
  user: GithubApiUser | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  merged_at: string | null; // ISO 8601
  closed_at: string | null; // ISO 8601
  additions: number;
  deletions: number;
  changed_files: number;
  labels: GithubApiLabel[];
  base: {
    repo: {
      name: string; // "my-repo"
      full_name: string; // "org/my-repo"
    };
  };
}

/**
 * Shape returned by GET /repos/{owner}/{repo}/pulls/{number}/reviews
 *
 * PENDING reviews exist in GitHub's system but have not been submitted yet.
 * GithubMapper filters them out - they have no submitted_at and are not
 * meaningful signals.
 */
export interface GithubApiReview {
  id: number;
  node_id: string;
  /** Null when the reviewer's account has been deleted. */
  user: GithubApiUser | null;
  body: string | null;
  state:
    | 'APPROVED'
    | 'CHANGES_REQUESTED'
    | 'COMMENTED'
    | 'DISMISSED'
    | 'PENDING';
  submitted_at: string; // ISO 8601 - absent/empty for PENDING
  pull_request_url: string;
}

/** Shape returned by GET /repos/{owner}/{repo} */
export interface GithubApiRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  default_branch: string;
}

// =============================================================================
// Pagination envelope
// =============================================================================

/**
 * Wrapper around a paginated API response.
 * GithubApiClient wraps every paginated endpoint in this shape by
 * parsing the GitHub Link header.
 */
export interface GithubPageResult<T> {
  items: T[];
  /** True when a Link: rel="next" header was present in the response. */
  hasNextPage: boolean;
}

// =============================================================================
// Normalized internal domain types
// =============================================================================

/** Maps to PullRequestState enum in schema.prisma */
export type NormalizedPrState = 'OPEN' | 'CLOSED' | 'MERGED';

/**
 * Maps to ReviewState enum in schema.prisma.
 * PENDING is excluded - those reviews have not been submitted yet.
 */
export type NormalizedReviewState =
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'COMMENTED'
  | 'DISMISSED';

/**
 * Normalized GitHub user.
 * Stored as a Developer record; isBot=true records are skipped by the
 * repository layer to avoid polluting the developer list with automation.
 */
export interface NormalizedGithubUser {
  /** String representation of GitHub's numeric user ID. Stable identity key. */
  githubId: string;
  githubLogin: string;
  /**
   * The list endpoint does not include the display name - login is used
   * as a safe fallback. The user detail endpoint (/users/{login}) could
   * fill this in, but that would add one API call per unique author which
   * is too expensive for Phase 2 bulk sync.
   */
  name: string;
  avatarUrl: string | null;
  isBot: boolean;
}

/** Normalized pull request ready to be upserted into the PullRequest table. */
export interface NormalizedPullRequest {
  githubNodeId: string;
  number: number;
  title: string;
  body: string | null;
  state: NormalizedPrState;
  draft: boolean;
  url: string;
  repositoryName: string;
  repositoryFullName: string;
  /** Null when the author account was deleted on GitHub. */
  author: NormalizedGithubUser | null;
  githubCreatedAt: Date;
  githubUpdatedAt: Date;
  mergedAt: Date | null;
  closedAt: Date | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  /** Label names only (colors and IDs are not stored). */
  labels: string[];
}

/** Normalized review ready to be upserted into the PullRequestReview table. */
export interface NormalizedReview {
  githubNodeId: string;
  /** The node_id of the parent NormalizedPullRequest. Used to resolve the FK. */
  prGithubNodeId: string;
  state: NormalizedReviewState;
  body: string | null;
  submittedAt: Date;
  /** Null when the reviewer account was deleted on GitHub. */
  reviewer: NormalizedGithubUser | null;
}

/** Normalized repository used to populate the SyncedRepository table. */
export interface NormalizedRepository {
  githubNodeId: string;
  name: string;
  fullName: string;
  defaultBranch: string;
}
