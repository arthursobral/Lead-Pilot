import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ObservationSeverity, ObservationType } from '@prisma/client';

export class CreateObservationDto {
  @IsEnum(ObservationType)
  type: ObservationType;

  @IsEnum(ObservationSeverity)
  severity: ObservationSeverity;

  /**
   * Short description shown in the timeline and observation list.
   * Keep concise -- detail can hold extended notes.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  summary: string;

  /** Optional extended notes shown only in the detail view. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  detail?: string;

  /**
   * ISO 8601 date-time string for when the event actually occurred.
   * Callers may record observations days after the fact -- this field
   * captures the real event date, not the recording date.
   */
  @IsDateString()
  occurredAt: string;

  /**
   * Optional until authentication is implemented.
   * Phase 5: remove this field and extract teamLeadId from the JWT token.
   * If omitted, ObservationsService falls back to the first available TeamLead.
   */
  @IsOptional()
  @IsString()
  teamLeadId?: string;
}
