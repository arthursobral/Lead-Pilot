import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ObservationSeverity, ObservationType } from '@prisma/client';

/**
 * All fields are optional -- PATCH semantics.
 *
 * Immutable fields (developerId, teamLeadId, occurredAt) are intentionally
 * excluded: changing who the observation is about, who wrote it, or when
 * the event happened would falsify the historical record.
 */
export class UpdateObservationDto {
  @IsOptional()
  @IsEnum(ObservationType)
  type?: ObservationType;

  @IsOptional()
  @IsEnum(ObservationSeverity)
  severity?: ObservationSeverity;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  detail?: string;
}
