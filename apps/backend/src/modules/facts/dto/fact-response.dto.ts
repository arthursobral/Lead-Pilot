import type { FactConfidence } from '@prisma/client';
import type { FactEvidence, FactType } from '../types/facts.types';

/**
 * HTTP response shape for a single Fact.
 * Returned by GET /developers/:developerId/facts and POST /facts/generate.
 */
export class FactResponseDto {
  id!: string;
  developerId!: string;
  type!: FactType;
  statement!: string;
  confidence!: FactConfidence;
  evidence!: FactEvidence[];
  dedupKey!: string;
  periodStart!: string;
  periodEnd!: string;
  createdAt!: string;
  updatedAt!: string;
}

export class PaginatedFactsResponseDto {
  data!: FactResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
}
