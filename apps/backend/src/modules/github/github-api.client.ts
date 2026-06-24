import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import type { AxiosRequestConfig, AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import type {
  GithubApiPullRequest,
  GithubApiRepository,
  GithubApiReview,
  GithubPageResult,
} from './github.types';
import {
  GithubAuthError,
  GithubNotFoundError,
  GithubRateLimitError,
} from './github.errors';

/**
 * GithubApiClient is the single point of access to the GitHub REST API v3.
 *
 * Responsibilities:
 *   - Build auth headers from config on every request (no cached state).
 *   - Issue HTTP requests via @nestjs/axios HttpService.
 *   - Parse the GitHub Link header for pagination.
 *   - Detect rate-limit, auth, and not-found errors and throw typed errors.
 *   - Log rate-limit warnings before the limit is exhausted.
 *   - Return raw GitHub API shapes - no mapping, no Prisma.
 *
 * The only consumer of this class is GithubService, which passes the raw
 * shapes through GithubMapper before returning them to callers.
 *
 * Authentication: Personal Access Token (GITHUB_TOKEN env var).
 * Scopes required: repo (for private repos) or public_repo (public only).
 * GitHub OAuth flows are handled by AuthModule and are out of scope here.
 */
@Injectable()
export class GithubApiClient {
  private readonly logger = new Logger(GithubApiClient.name);
  private readonly baseUrl = 'https://api.github.com';
  private readonly perPage = 100; // GitHub maximum

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API methods
  // ---------------------------------------------------------------------------

  /**
   * Fetch one page of pull requests for a repository.
   *
   * Sorted by `updated` descending so re-syncing a repo picks up recent
   * changes on the first page without scanning the full history every time.
   *
   * Returns raw GithubApiPullRequest shapes + a hasNextPage flag derived
   * from the Link response header.
   */
  async fetchPullRequestsPage(
    repositoryFullName: string,
    page: number,
  ): Promise<GithubPageResult<GithubApiPullRequest>> {
    this.logger.debug(
      `Fetching PRs: ${repositoryFullName} page=${page} per_page=${this.perPage}`,
    );

    const { data, headers } = await this.request<GithubApiPullRequest[]>(
      `/repos/${repositoryFullName}/pulls`,
      {
        state: 'all',
        per_page: this.perPage,
        page,
        sort: 'updated',
        direction: 'desc',
      },
    );

    this.logRateLimitWarning(headers, repositoryFullName);

    return {
      items: data,
      hasNextPage: this.parseHasNextPage(headers['link']),
    };
  }

  /**
   * Fetch all submitted reviews for a single pull request.
   *
   * GitHub returns all reviews in a single response for typical PRs
   * (hundreds of comments before pagination kicks in at 100 reviews per page).
   * Paginating review lists is left as a future enhancement; for Phase 2
   * the per_page=100 cap is sufficient.
   */
  async fetchReviews(
    repositoryFullName: string,
    prNumber: number,
  ): Promise<GithubApiReview[]> {
    this.logger.debug(
      `Fetching reviews: ${repositoryFullName}#${prNumber}`,
    );

    const { data } = await this.request<GithubApiReview[]>(
      `/repos/${repositoryFullName}/pulls/${prNumber}/reviews`,
      { per_page: this.perPage },
    );

    return data;
  }

  /**
   * Fetch repository metadata.
   * Used to populate or update a SyncedRepository record at sync start.
   */
  async fetchRepository(
    repositoryFullName: string,
  ): Promise<GithubApiRepository> {
    this.logger.debug(`Fetching repository info: ${repositoryFullName}`);

    const { data } = await this.request<GithubApiRepository>(
      `/repos/${repositoryFullName}`,
    );

    return data;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Shared HTTP GET with auth headers and error classification.
   *
   * Uses firstValueFrom to bridge rxjs Observable (HttpService) → Promise
   * so callers can use async/await consistently.
   */
  private async request<T>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<{ data: T; headers: Record<string, string> }> {
    const url = `${this.baseUrl}${path}`;
    const config: AxiosRequestConfig = {
      headers: this.buildHeaders(),
      params,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(url, config),
      );
      return {
        data: response.data,
        headers: response.headers as Record<string, string>,
      };
    } catch (error: unknown) {
      return this.classifyAndThrow(error, path);
    }
  }

  /** Build request headers for every GitHub API call. */
  private buildHeaders(): Record<string, string> {
    const token = this.configService.get<string>('github.token');

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // Unauthenticated requests are allowed but rate-limited to 60/hour.
      this.logger.warn(
        'GITHUB_TOKEN is not set. Requests are unauthenticated and limited to 60/hour.',
      );
    }

    return headers;
  }

  /**
   * Parse the Link header to determine if there is a next page.
   *
   * GitHub's Link header format:
   *   <https://api.github.com/...?page=2>; rel="next", <...>; rel="last"
   *
   * We check for the presence of rel="next" rather than parsing the URL
   * because the page number we pass in already drives which page we get.
   */
  private parseHasNextPage(linkHeader: string | undefined): boolean {
    if (!linkHeader) return false;
    return linkHeader.includes('rel="next"');
  }

  /** Log a warning when the remaining rate limit drops below 100 requests. */
  private logRateLimitWarning(
    headers: Record<string, string>,
    context: string,
  ): void {
    const remaining = headers['x-ratelimit-remaining'];
    const resetEpoch = headers['x-ratelimit-reset'];

    if (remaining === undefined) return;

    const remaining_n = parseInt(remaining, 10);
    if (remaining_n < 100) {
      const resetAt = resetEpoch
        ? new Date(parseInt(resetEpoch, 10) * 1000).toISOString()
        : 'unknown';
      this.logger.warn(
        `GitHub rate limit low: ${remaining_n} requests remaining (resets at ${resetAt}) [${context}]`,
      );
    }
  }

  /**
   * Classify axios errors into typed GitHub errors.
   *
   * Typed errors let the BullMQ processor decide retry strategy without
   * inspecting raw status codes. Unrecognised errors are re-thrown as-is
   * so BullMQ's default retry policy handles them.
   */
  private classifyAndThrow(error: unknown, endpoint: string): never {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const responseHeaders = axiosError.response?.headers as
      | Record<string, string>
      | undefined;

    if (status === 401) {
      throw new GithubAuthError(endpoint);
    }

    if (status === 403 || status === 429) {
      const resetHeader = responseHeaders?.['x-ratelimit-reset'];
      const resetAt = resetHeader
        ? new Date(parseInt(resetHeader, 10) * 1000)
        : null;
      throw new GithubRateLimitError(resetAt, endpoint);
    }

    if (status === 404) {
      throw new GithubNotFoundError(endpoint, endpoint);
    }

    // Network errors, 5xx, etc. - re-throw and let BullMQ retry.
    throw error;
  }
}
