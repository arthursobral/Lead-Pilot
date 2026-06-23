import { Controller } from '@nestjs/common';
import { GithubService } from './github.service';

/**
 * GithubController
 *
 * Routes (Phase 2):
 *   POST /api/github/sync        — trigger a manual sync for a repository
 *   GET  /api/github/repositories — list connected repositories
 */
@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  // Routes implemented in Phase 2
}
