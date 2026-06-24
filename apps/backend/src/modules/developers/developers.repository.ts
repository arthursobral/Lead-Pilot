import { Injectable } from '@nestjs/common';
import type { Developer, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { UpsertDeveloperData } from './types/developer.types';

/**
 * DevelopersRepository owns all Prisma queries for the Developer model.
 *
 * Rules:
 *   - No business logic. No NotFoundException. No logging.
 *   - Return Prisma models or null. The service decides what to do.
 *   - Use transactions wherever two writes must be atomic.
 */
@Injectable()
export class DevelopersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all developers linked to a team lead, with offset pagination.
   *
   * Queries through the TeamLeadDeveloper join table so a team lead
   * only sees developers they are responsible for.
   *
   * Returns { developers, total } so the service can build the
   * PaginatedResponse without a second query round-trip.
   */
  async findAllByTeamLead(
    teamLeadId: string,
    page: number,
    limit: number,
  ): Promise<{ developers: Developer[]; total: number }> {
    const skip = (page - 1) * limit;

    const [developers, total] = await this.prisma.$transaction([
      this.prisma.developer.findMany({
        where: {
          teamLeads: {
            some: { teamLeadId },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.developer.count({
        where: {
          teamLeads: {
            some: { teamLeadId },
          },
        },
      }),
    ]);

    return { developers, total };
  }

  /**
   * Fetch a single developer, but only if linked to the given team lead.
   *
   * The join-table check (teamLeads.some) handles both "not found" and
   * "found but not authorized" in one query -- no TOCTOU race, no extra
   * round-trip. Returns null for both cases; the service surfaces the error.
   */
  async findByIdForTeamLead(
    id: string,
    teamLeadId: string,
  ): Promise<Developer | null> {
    return this.prisma.developer.findFirst({
      where: {
        id,
        teamLeads: {
          some: { teamLeadId },
        },
      },
    });
  }

  /**
   * Upsert a developer by githubId, then ensure the team lead link exists.
   *
   * Both writes are in a transaction so the developer row and join row are
   * always consistent -- no orphaned developers, no missing links.
   *
   * On update, only non-undefined fields are applied. This lets the GitHub
   * sync update avatarUrl without accidentally clearing a manually-set role.
   */
  async upsertWithTeamLead(
    data: UpsertDeveloperData,
    teamLeadId: string,
  ): Promise<Developer> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const developer = await tx.developer.upsert({
        where: { githubId: data.githubId },
        create: {
          githubId: data.githubId,
          githubLogin: data.githubLogin,
          name: data.name,
          email: data.email ?? null,
          avatarUrl: data.avatarUrl ?? null,
          role: data.role ?? null,
        },
        update: {
          githubLogin: data.githubLogin,
          name: data.name,
          ...(data.email !== undefined && { email: data.email }),
          ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
          ...(data.role !== undefined && { role: data.role }),
        },
      });

      // Upsert the join record -- idempotent, safe to call on every sync.
      await tx.teamLeadDeveloper.upsert({
        where: {
          teamLeadId_developerId: {
            teamLeadId,
            developerId: developer.id,
          },
        },
        create: { teamLeadId, developerId: developer.id },
        update: {},
      });

      return developer;
    });
  }

  /**
   * Look up a developer by their GitHub node ID.
   * Used by the GitHub sync job (Phase 2) to match incoming webhook payloads.
   */
  async findByGithubId(githubId: string): Promise<Developer | null> {
    return this.prisma.developer.findUnique({
      where: { githubId },
    });
  }

  /**
   * Upsert a developer by githubId without a team lead context.
   *
   * Used by the GitHub sync job to store PR authors and reviewers before
   * a team lead has explicitly linked them. The team lead link is added
   * separately when the team lead registers the developer via the UI.
   *
   * Only githubLogin, name, and avatarUrl are updated on conflict --
   * manually-set fields (role, email) are never overwritten by a sync.
   */
  async upsertByGithubId(data: {
    githubId: string;
    githubLogin: string;
    name: string;
    avatarUrl?: string | null;
  }): Promise<Developer> {
    return this.prisma.developer.upsert({
      where: { githubId: data.githubId },
      create: {
        githubId: data.githubId,
        githubLogin: data.githubLogin,
        name: data.name,
        avatarUrl: data.avatarUrl ?? null,
      },
      update: {
        githubLogin: data.githubLogin,
        name: data.name,
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
    });
  }
}
