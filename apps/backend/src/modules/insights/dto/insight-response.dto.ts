import type { InsightType } from '@prisma/client';

export interface TalkingPointResponseDto {
  id: string;
  text: string;
  order: number;
}

export interface InsightResponseDto {
  id: string;
  developerId: string;
  type: InsightType;
  summary: string;
  model: string | null;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  talkingPoints: TalkingPointResponseDto[];
}

export interface PaginatedInsightsResponseDto {
  data: InsightResponseDto[];
  total: number;
  page: number;
  limit: number;
}
