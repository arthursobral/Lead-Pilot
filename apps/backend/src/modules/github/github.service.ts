import { Injectable, Logger } from '@nestjs/common';
import { GithubRepository } from './github.repository';

/**
 * GithubService
 *
 * Responsibilities (Phase 2):
 *   - Fetch pull requests from GitHub REST API
 *   - Fetch reviews for each pull request
 *   - Upsert raw data into the database as Signals
 *   - Enqueue sync jobs for background processing
 */
@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(private readonly githubRepository: GithubRepository) {}

  // Implemented in Phase 2
}
