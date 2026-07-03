import type { FactConfidence } from '@prisma/client';
import type { FactEvidence, FactEvidenceSourceType, FactType } from '../../facts/types/facts.types';

// Re-export so KnowledgeService helpers can use them without double-import.
export type { FactEvidence, FactRecord } from '../../facts/types/facts.types';

// ---------------------------------------------------------------------------
// Context Pack -- Timeline
// ---------------------------------------------------------------------------

/**
 * A single timeline entry included in a ContextPack.
 * Stripped down for the AI layer -- no FK columns, no pagination metadata.
 */
export interface ContextPackTimelineEntry {
  type: string;          // TimelineEntryType enum value
  summary: string;       // pre-computed display text, built at insert time
  occurredAt: string;    // ISO 8601
  sourceType: string;    // 'observation' | 'pull_request' | 'pull_request_review' | etc.
  sourceId: string | null;
}

// ---------------------------------------------------------------------------
// Evidence Map
// ---------------------------------------------------------------------------

/**
 * A single entry in the evidence map.
 * Provides human-readable context for a source entity referenced by a Fact.
 */
export interface EvidenceMapEntry {
  sourceType: FactEvidenceSourceType;
  summary: string;   // short human-readable description of the source
  date: string;      // ISO 8601 -- when the source occurred or was created
}

/**
 * A flat map from sourceId to its evidence summary.
 *
 * When the AI layer reads a Fact's evidence array, it can look up any
 * sourceId here for full context without additional API calls.
 *
 * Populated from all unique evidence references across all facts in the pack.
 */
export type EvidenceMap = Record<string, EvidenceMapEntry>;

// ---------------------------------------------------------------------------
// Context Pack -- Developer / Metrics / Observations
// ---------------------------------------------------------------------------

/** Developer profile snapshot included in every ContextPack. */
export interface ContextPackDeveloper {
  id: string;
  name: string;
  githubLogin: string;
  role: string | null;
}

/** Metric data included in a ContextPack when a snapshot exists for the period. */
export interface ContextPackMetrics {
  pullRequestsOpened: number;
  pullRequestsMerged: number;
  pullRequestsClosed: number;
  reviewsGiven: number;
  reviewsReceived: number;
  averagePrSizeLines: number | null;
  averageMergeTimeHours: number | null;
  activeRepositories: string[];
  repoFocus: Record<string, number>;
}

/**
 * A single observation summary included in a ContextPack.
 * Only fields relevant for AI context -- no internal IDs.
 */
export interface ContextPackObservation {
  type: string;
  severity: string;
  summary: string;
  detail: string | null;
  occurredAt: string;
}

/** A structured Fact included in a ContextPack. */
export interface ContextPackFact {
  id: string;           // Fact.id -- required by the AI layer for FactInsight linkage
  type: FactType;
  statement: string;
  confidence: FactConfidence;
  evidence: FactEvidence[];
}

// ---------------------------------------------------------------------------
// Context Pack (full structure)
// ---------------------------------------------------------------------------

/**
 * Dynamic, assembled-per-request context package.
 * Never persisted -- built fresh on every GET /context-pack call.
 *
 * The AI layer (Day 6) consumes this structure directly.
 *
 * Fields:
 *   developer    -- developer profile
 *   period       -- the analysis window (inclusive start, exclusive end)
 *   metrics      -- MetricSnapshot for the period (null if no snapshot exists)
 *   observations -- human observations recorded during the period
 *   timeline     -- chronological timeline entries for the period
 *   facts        -- evidence-backed facts extracted for the period
 *   evidenceMap  -- sourceId -> evidence summary (fast lookup for the AI layer)
 *   generatedAt  -- ISO 8601 timestamp when this pack was assembled
 */
export interface ContextPack {
  developer: ContextPackDeveloper;
  period: {
    start: string;
    end: string;
  };
  metrics: ContextPackMetrics | null;
  observations: ContextPackObservation[];
  timeline: ContextPackTimelineEntry[];
  facts: ContextPackFact[];
  evidenceMap: EvidenceMap;
  generatedAt: string;
}
