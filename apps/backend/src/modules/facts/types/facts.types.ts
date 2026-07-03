import type { FactConfidence } from '@prisma/client';

// ---------------------------------------------------------------------------
// FactType -- defined locally so the Facts module compiles before the
// Day 5 Prisma migration is applied and client regenerated.
//
// Values MUST match the FactType enum in schema.prisma exactly.
// ---------------------------------------------------------------------------
export const FactType = {
  ACTIVITY_SIGNAL: 'ACTIVITY_SIGNAL',
  COLLABORATION_SIGNAL: 'COLLABORATION_SIGNAL',
  METRIC_PATTERN: 'METRIC_PATTERN',
  OBSERVATION_FACT: 'OBSERVATION_FACT',
  ACHIEVEMENT: 'ACHIEVEMENT',
  COACHING_SIGNAL: 'COACHING_SIGNAL',
} as const;

export type FactType = (typeof FactType)[keyof typeof FactType];

// ---------------------------------------------------------------------------
// FactRecord -- shape of a persisted Fact row (post Day-5 migration).
// ---------------------------------------------------------------------------
export interface FactRecord {
  id: string;
  developerId: string;
  type: FactType;
  statement: string;
  confidence: FactConfidence;
  evidence: unknown; // Json -- cast to FactEvidence[] at the service layer
  dedupKey: string;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export type FactEvidenceSourceType =
  | 'METRIC_SNAPSHOT'
  | 'OBSERVATION'
  | 'TIMELINE_ENTRY';

/**
 * A single piece of evidence supporting a Fact.
 * Stored as a Json array in the facts.evidence column.
 */
export interface FactEvidence {
  sourceType: FactEvidenceSourceType;
  sourceId: string;
}

// ---------------------------------------------------------------------------
// Write interfaces
// ---------------------------------------------------------------------------

/**
 * All fields required to upsert a Fact via FactsRepository.
 * dedupKey is computed by FactsService before calling upsert.
 */
export interface UpsertFactData {
  developerId: string;
  type: FactType;
  statement: string;
  confidence: FactConfidence;
  evidence: FactEvidence[];
  dedupKey: string;
  periodStart: Date;
  periodEnd: Date;
}

// ---------------------------------------------------------------------------
// Read interfaces
// ---------------------------------------------------------------------------

export interface ListFactsOptions {
  type?: FactType;
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
