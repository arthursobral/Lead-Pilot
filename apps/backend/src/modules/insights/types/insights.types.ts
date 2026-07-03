import type { InsightType } from '@prisma/client';

/**
 * Raw Insight record as returned from the database.
 * Mirrors the Prisma Insight model shape for use within the module boundary.
 */
export interface InsightRecord {
  id: string;
  developerId: string;
  type: InsightType;
  summary: string;
  model: string | null;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  talkingPoints: TalkingPointRecord[];
}

export interface TalkingPointRecord {
  id: string;
  insightId: string;
  text: string;
  order: number;
  createdAt: Date;
}

export interface ListInsightsOptions {
  periodStart?: Date;
  periodEnd?: Date;
  type?: InsightType;
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
