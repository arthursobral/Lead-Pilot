import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { PaginatedResponse } from '../../common/types/paginated-response.type';
import type { CreateDeveloperDto } from './dto/create-developer.dto';
import type { DeveloperResponseDto } from './dto/developer-response.dto';
import type { ListDevelopersQueryDto } from './dto/list-developers-query.dto';
import { DevelopersRepository } from './developers.repository';
import { DeveloperMapper } from './mapper/developer.mapper';

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
   *
   * Results are ordered alphabetically by name (repository concern)
   * and returned in a standard PaginatedResponse envelope.
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
   * The repository queries through the TeamLeadDeveloper join table, so
   * a null result means either "not found" or "not authorized" -- both are
   * surfaced as 404. This is intentional: leaking whether a developer ID
   * exists would allow team leads to probe for profiles they do not own.
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
   *
   * Uses upsert semantics keyed on githubId so the operation is idempotent.
   * The GitHub sync job (Phase 2) calls this method directly, not via HTTP.
   * The HTTP endpoint (POST /developers) is for manual registration.
   *
   * On update, only fields present in the DTO are applied -- undefined fields
   * are not written, so a sync cannot accidentally wipe a manually-set role.
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
}
