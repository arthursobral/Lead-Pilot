import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ObservationsService } from './observations.service';
import { CreateObservationDto } from './dto/create-observation.dto';
import { UpdateObservationDto } from './dto/update-observation.dto';
import { ListObservationsQueryDto } from './dto/list-observations-query.dto';

/**
 * ObservationsController
 *
 * Routes (all nested under a developer resource):
 *   POST   /api/developers/:developerId/observations          -- create
 *   GET    /api/developers/:developerId/observations          -- list (paginated)
 *   GET    /api/developers/:developerId/observations/:id      -- get single
 *   PATCH  /api/developers/:developerId/observations/:id      -- update
 *   DELETE /api/developers/:developerId/observations/:id      -- soft delete
 *
 * All routes are developer-scoped. The :id routes validate that the
 * observation belongs to the given developer, so callers cannot access
 * another developer's observations by guessing an ID.
 *
 * Controllers are thin: no business logic, no direct Prisma access.
 * All logic lives in ObservationsService.
 *
 * Auth: not yet implemented. teamLeadId is optional in the request body.
 * Phase 5: add JwtAuthGuard and extract teamLeadId from the JWT token.
 */
@Controller()
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService) {}

  // ---------------------------------------------------------------------------
  // POST /api/developers/:developerId/observations
  // ---------------------------------------------------------------------------

  /**
   * Create a new observation for a developer.
   *
   * Creates the Observation and its linked TimelineEntry atomically.
   * Returns 201 Created with the new observation.
   *
   * Body: CreateObservationDto
   *   type        -- ObservationType (required)
   *   severity    -- ObservationSeverity (required)
   *   summary     -- short description, 1-500 chars (required)
   *   detail      -- extended notes, max 2000 chars (optional)
   *   occurredAt  -- ISO 8601 when the event happened (required)
   *   teamLeadId  -- optional pre-auth; Phase 5: extracted from JWT
   */
  @Post('developers/:developerId/observations')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('developerId') developerId: string,
    @Body() dto: CreateObservationDto,
  ) {
    return this.observationsService.create(developerId, dto);
  }

  // ---------------------------------------------------------------------------
  // GET /api/developers/:developerId/observations
  // ---------------------------------------------------------------------------

  /**
   * List observations for a developer, paginated.
   *
   * Ordered by occurredAt DESC. Soft-deleted observations are excluded.
   *
   * Query params:
   *   type     -- filter by ObservationType
   *   severity -- filter by ObservationSeverity
   *   page     -- page number (default 1)
   *   limit    -- page size (default 20, max 100)
   */
  @Get('developers/:developerId/observations')
  async list(
    @Param('developerId') developerId: string,
    @Query() query: ListObservationsQueryDto,
  ) {
    return this.observationsService.listByDeveloper(developerId, query);
  }

  // ---------------------------------------------------------------------------
  // GET /api/developers/:developerId/observations/:id
  // ---------------------------------------------------------------------------

  /**
   * Get a single observation by ID.
   *
   * Returns 404 if the observation does not exist, is soft-deleted,
   * or does not belong to the given developer.
   */
  @Get('developers/:developerId/observations/:id')
  async getById(
    @Param('developerId') developerId: string,
    @Param('id') id: string,
  ) {
    return this.observationsService.getById(id, developerId);
  }

  // ---------------------------------------------------------------------------
  // PATCH /api/developers/:developerId/observations/:id
  // ---------------------------------------------------------------------------

  /**
   * Update mutable fields on an observation.
   *
   * All fields are optional (PATCH semantics). Immutable fields
   * (developerId, teamLeadId, occurredAt) cannot be changed.
   *
   * When type or summary changes, the linked TimelineEntry summary is
   * updated automatically to keep the timeline in sync.
   *
   * Returns 404 if not found, soft-deleted, or wrong developer.
   */
  @Patch('developers/:developerId/observations/:id')
  async update(
    @Param('developerId') developerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateObservationDto,
  ) {
    return this.observationsService.update(id, dto, developerId);
  }

  // ---------------------------------------------------------------------------
  // DELETE /api/developers/:developerId/observations/:id
  // ---------------------------------------------------------------------------

  /**
   * Soft-delete an observation.
   *
   * Sets deletedAt and removes the linked TimelineEntry atomically.
   * Hard deletion never happens -- observations are irreplaceable human context.
   *
   * Returns 204 No Content on success.
   * Returns 404 if not found, already deleted, or wrong developer.
   */
  @Delete('developers/:developerId/observations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('developerId') developerId: string,
    @Param('id') id: string,
  ) {
    await this.observationsService.delete(id, developerId);
  }
}
