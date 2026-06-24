import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { PaginatedResponse } from '../../common/types/paginated-response.type';
import type { CreateDeveloperDto } from './dto/create-developer.dto';
import type { DeveloperResponseDto } from './dto/developer-response.dto';
import type { ListDevelopersQueryDto } from './dto/list-developers-query.dto';
import { DevelopersRepository } from './developers.repository';
import { DeveloperMapper } from './mapper/developer.mapper';
import type { DeveloperDomain } from './types/developer.types';

/**
 * DevelopersService contains all business logic for the Developer domain.
 *
 * Responsibilities:
 *   - Enforce pagination defaults and limits
 *   - Verify team lead access before returning a developer
 *   - Orchestrate upsert: create-or-update developer profile + team lead link
 *   - Map Prisma models to domain objects and API responses
 *
 * The service never touches Prisma directly -- it delegates to the repository.
 * The service never returns Prisma models -- it always maps through DeveloperMapper.
 */
@Injectable()
export class DevelopersService {
  private readonly logger = new Logger(DevelopersService.name);

  constructor(
    private readonly developersRepository: DevelopersRepository,
    private readonly developerMapper: DeveloperMapper,
  ) {}

  /**
   * List all developers the team lead has access to, paginated.
   */
  async findAll(
    teamLeadId: string,
    query: ListDevelopersQueryDto,
  ): Promise<PaginatedResponse<DeveloperResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { developers, total } =
      await this.developersRepository.findAllByTeamLead(teamLeadId, page, limit);

    const domains = developers.map((d) => this.developerMapper.toDomain(d));
    const data = this.developerMapper.toResponseList(domains);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single developer profile.
   *
   * Returns 404 for both "not found" and "not authorized" -- leaking
   * whether a developer ID exists would allow probing across team boundaries.
   */
  async findById(
    id: string,
    teamLeadId: string,
  ): Promise<DeveloperResponseDto> {
    const record = await this.developersRepository.findByIdForTeamLead(
      id,
      teamLeadId,
    );

    if (!record) {
      throw new NotFoundException(`Developer ${id} not found`);
    }

    return this.developerMapper.toResponse(this.developerMapper.toDomain(record));
  }

  /**
   * Create or update a developer profile and link them to the team lead.
   * Used by POST /developers (manual registration) and the GitHub sync job.
   */
  async upsert(
    dto: CreateDeveloperDto,
    teamLeadId: string,
  ): Promise<DeveloperResponseDto> {
    this.logger.log(
      `Upserting developer githubId=${dto.githubId} for teamLead=${teamLeadId}`,
    );

    const record = await this.developersRepository.upsertWithTeamLead(
      {
        githubId: dto.githubId,
        githubLogin: dto.githubLogin,
        name: dto.name,
        email: dto.email,
        avatarUrl: dto.avatarUrl,
        role: dto.role,
      },
      teamLeadId,
    );

    return this.developerMapper.toResponse(this.developerMapper.toDomain(record));
  }

  /**
   * Upsert a developer discovered during GitHub sync, without a teamLead context.
   *
   * Called by GithubService when persisting PR authors and reviewers.
   * Creates the Developer row so PRs/reviews can reference it via FK,
   * even before a team lead explicitly links this developer to their team.
   *
   * Returns DeveloperDomain (not the response DTO) so the caller gets the
   * stable Prisma id needed for FK assignment on PullRequest.developerId
   * and PullRequestReview.developerId.
   */
  async upsertFromGithub(data: {
    githubId: string;
    githubLogin: string;
    name: string;
    avatarUrl?: string | null;
  }): Promise<DeveloperDomain> {
    const record = await this.developersRepository.upsertByGithubId(data);
    return this.developerMapper.toDomain(record);
  }
}
