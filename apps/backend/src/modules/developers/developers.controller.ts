import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { ListDevelopersQueryDto } from './dto/list-developers-query.dto';
import { DevelopersService } from './developers.service';

/**
 * DevelopersController exposes the Developer domain over HTTP.
 *
 * The controller is intentionally thin:
 *   - Validate and extract inputs (handled by ValidationPipe + decorators)
 *   - Call the service with the authenticated team lead ID
 *   - Return the result
 *
 * All business logic lives in DevelopersService.
 *
 * Auth note: JwtAuthGuard is wired now. It activates when JwtStrategy is
 * registered in Phase 2 (auth module). Until then, the guard is present
 * but the strategy is not configured, so unauthenticated requests will
 * reach the controller and user will be undefined. This is acceptable
 * during Phase 1 development -- no UI calls these endpoints yet.
 */
@Controller('developers')
@UseGuards(JwtAuthGuard)
export class DevelopersController {
  constructor(private readonly developersService: DevelopersService) {}

  /**
   * GET /api/developers
   *
   * Returns a paginated list of developers the team lead has access to.
   * Ordered alphabetically by name.
   */
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListDevelopersQueryDto,
  ) {
    return this.developersService.findAll(user.id, query);
  }

  /**
   * GET /api/developers/:id
   *
   * Returns a single developer profile.
   * Returns 404 if not found or if the developer is not linked to the
   * requesting team lead (intentional -- avoids leaking developer ID existence).
   */
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.developersService.findById(id, user.id);
  }

  /**
   * POST /api/developers
   *
   * Creates or updates a developer profile and links them to the team lead.
   * Upserts on githubId -- safe to call multiple times with the same identity.
   * Returns 201 on both create and update.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  upsert(
    @Body() dto: CreateDeveloperDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.developersService.upsert(dto, user.id);
  }
}
