import { IsDateString } from 'class-validator';

/**
 * Request body for POST /developers/:developerId/insights/generate.
 *
 * Both bounds are required -- insight generation is always period-scoped.
 * Convention: periodStart inclusive, periodEnd exclusive.
 *
 * Call POST /facts/generate for the same period first to ensure the
 * ContextPack Facts are current before generating insights.
 *
 * Example body:
 *   { "periodStart": "2026-06-01", "periodEnd": "2026-07-01" }
 */
export class GenerateInsightBodyDto {
  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}
