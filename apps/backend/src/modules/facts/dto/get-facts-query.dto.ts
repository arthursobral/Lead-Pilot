import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FactType } from '../types/facts.types';

/**
 * Query parameters for GET /developers/:developerId/facts.
 */
export class GetFactsQueryDto {
  @IsOptional()
  @IsEnum(FactType)
  type?: FactType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
