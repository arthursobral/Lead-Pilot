import { IsDateString } from 'class-validator';

/**
 * Request body for POST /developers/:developerId/facts/generate.
 *
 * Both bounds are required -- fact extraction is always period-scoped.
 * Convention: periodStart inclusive, periodEnd exclusive.
 *
 * Example body:
 *   { "periodStart": "2026-06-01", "periodEnd": "2026-07-01" }
 */
export class GenerateFactsBodyDto {
  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}
