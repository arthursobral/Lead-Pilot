import { IsDateString } from 'class-validator';

/**
 * Query parameters for GET /developers/:developerId/context-pack.
 *
 * Both bounds are required -- context packs are always period-scoped.
 */
export class ContextPackQueryDto {
  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}
