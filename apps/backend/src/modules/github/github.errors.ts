/**
 * Typed errors for GitHub API failures.
 *
 * Using distinct error classes rather than generic Error instances lets the
 * BullMQ processor make informed retry decisions without inspecting error
 * messages or status codes at the job level:
 *
 *   GithubRateLimitError  → retry with backoff aligned to the reset window
 *   GithubAuthError       → fatal, do not retry (config problem)
 *   GithubNotFoundError   → fatal, do not retry (bad repo name or deleted resource)
 *   GithubApiError        → unexpected, retry via normal BullMQ policy
 */

export class GithubApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly endpoint?: string,
  ) {
    super(message);
    this.name = 'GithubApiError';
    // Preserve the prototype chain for instanceof checks.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GithubRateLimitError extends GithubApiError {
  constructor(
    /** When the rate limit window resets. Null if the header was absent. */
    public readonly resetAt: Date | null,
    endpoint?: string,
  ) {
    super(
      `GitHub rate limit exceeded. Resets at: ${resetAt?.toISOString() ?? 'unknown'}`,
      429,
      endpoint,
    );
    this.name = 'GithubRateLimitError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GithubAuthError extends GithubApiError {
  constructor(endpoint?: string) {
    super(
      'GitHub API authentication failed. Verify that GITHUB_TOKEN is set and has the required scopes (repo).',
      401,
      endpoint,
    );
    this.name = 'GithubAuthError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GithubNotFoundError extends GithubApiError {
  constructor(resource: string, endpoint?: string) {
    super(
      `GitHub resource not found: ${resource}. Check that the repository name is correct and the token has access.`,
      404,
      endpoint,
    );
    this.name = 'GithubNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
