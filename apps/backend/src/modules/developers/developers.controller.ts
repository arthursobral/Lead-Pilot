import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { ListDevelopersQueryDto } from './dto/list-developers-query.dto';
import { DevelopersService } from './developers.service';

// ---------------------------------------------------------------------------
// DAY 4 VALIDATION BYPASS -- REMOVE IN PHASE 5
//
// Auth is not yet implemented (Phase 5). JwtAuthGuard and @CurrentUser()
// have been temporarily removed so Postman validation can proceed without
// a JWT token.
//
// The TeamLead ID is read from DEV_TEAM_LEAD_ID in .env (gitignored).
// The hardcoded ID never touches source control.
//
// The production guard below makes accidental deployment impossible:
// if DEV_TEAM_LEAD_ID is set and NODE_ENV=production, the app refuses to boot.
//
// Steps to restore in Phase 5:
//   1. Delete this entire block and the TEAM_LEAD_ID constant.
//   2. Re-add: import { UseGuards } from '@nestjs/common';
//   3. Re-add: import { CurrentUser } from '../../common/decorators/current-user.decorator';
//   4. Re-add: import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
//   5. Re-add: import type { AuthenticatedUser } from '../auth/types/auth.types';
//   6. Re-add @UseGuards(JwtAuthGuard) on the class.
//   7. Replace TEAM_LEAD_ID with @CurrentUser() user: AuthenticatedUser everywhere.
//
// To seed DEV_TEAM_LEAD_ID: run `node prisma/seed.js` and add to .env:
//   DEV_TEAM_LEAD_ID=clxyz...
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === 'production' && process.env.DEV_TEAM_LEAD_ID) {
  throw new Error(
    '[DevelopersController] DEV_TEAM_LEAD_ID is set in a production environment. ' +
      'Remove the Day 4 auth bypass before deploying.',
  );
}

const TEAM_LEAD_ID = process.env.DEV_TEAM_LEAD_ID ?? '';

/**
 * DevelopersController exposes the Developer domain over HTTP.
 *
 * The controller is intentionally thin:
 *   - Validate and extract inputs (handled by ValidationPipe + decorators)
 *   - Call the service with the authenticated team lead ID
 *   - Return the result
 *
 * All business logic lives in DevelopersService.
 */
@Controller('developers')
export class DevelopersController {
  constructor(private readonly developersService: DevelopersService) {}

  /**
   * GET /api/developers
   *
   * Returns a paginated list of developers the team lead has access to.
   * Ordered alphabetically by name.
   */
  @Get()
  findAll(@Query() query: ListDevelopersQueryDto) {
    return this.developersService.findAll(TEAM_LEAD_ID, query);
  }

  /**
   * GET /api/developers/:id
   *
   * Returns a single developer profile.
   * Returns 404 if not found or if the developer is not linked to the
   * requesting team lead (intentional -- avoids leaking developer ID existence).
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.developersService.findById(id, TEAM_LEAD_ID);
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
  upsert(@Body() dto: CreateDeveloperDto) {
    return this.developersService.upsert(dto, TEAM_LEAD_ID);
  }
}
