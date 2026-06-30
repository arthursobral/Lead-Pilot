import { IsDateString } from 'class-validator';

/**
 * Query parameters for POST /developers/:developerId/facts/generate.
 *
 * Both bounds are required -- fact extraction is always period-scoped.
 * Period convention: periodStart inclusive, periodEnd exclusive.
 *
 * Example: periodStart=2026-06-01&periodEnd=2026-07-01 covers all of June.
 */
export class GenerateFactsQueryDto {
  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}
