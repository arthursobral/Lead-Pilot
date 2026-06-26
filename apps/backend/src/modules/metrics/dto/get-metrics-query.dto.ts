import { IsISO8601, IsOptional } from 'class-validator';

/**
 * Optional query params for GET /developers/:developerId/metrics.
 *
 * When omitted, the endpoint returns the most recent available snapshot.
 * When provided, both params must be supplied together to fetch a specific window.
 */
export class GetMetricsQueryDto {
  @IsISO8601()
  @IsOptional()
  periodStart?: string;

  @IsISO8601()
  @IsOptional()
  periodEnd?: string;
}
