import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * GithubRepository
 *
 * Prisma queries for PullRequest and PullRequestReview models.
 * Uses upsert semantics so sync jobs are safely idempotent.
 */
@Injectable()
export class GithubRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Implemented in Phase 2
}
