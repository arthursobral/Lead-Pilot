import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

/**
 * Payload for POST /developers.
 *
 * This endpoint is the entry point for registering a developer profile.
 * In Phase 2, the GitHub sync job will call DevelopersService.upsert()
 * directly (service-to-service), not via HTTP.
 *
 * The HTTP endpoint exists for cases where a team lead wants to pre-register
 * a developer before the GitHub sync runs, or to manually set profile fields.
 *
 * githubId + githubLogin are required because the Developer entity is
 * inherently tied to a GitHub identity. Profiles without GitHub accounts
 * are out of scope for the MVP.
 */
export class CreateDeveloperDto {
  @IsString()
  @MinLength(1)
  githubId: string;

  @IsString()
  @MinLength(1)
  githubLogin: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  role?: string;
}
