import { Injectable } from '@nestjs/common';
import type { MetricSnapshot, Observation } from '@prisma/client';
import type { FactRecord } from '../facts/types/facts.types';
import type { TimelineEntryWithSource } from '../timeline/types/timeline.types';
import type {
  ContextPack,
  ContextPackDeveloper,
  ContextPackFact,
  ContextPackMetrics,
  ContextPackObservation,
  ContextPackTimelineEntry,
  EvidenceMap,
  EvidenceMapEntry,
} from './types/knowledge.types';
import type { FactEvidence } from '../facts/types/facts.types';

/** Raw developer data passed from KnowledgeService. */
export interface ContextBuilderInput {
  developer: ContextPackDeveloper;
  period: { start: Date; end: Date };
  snapshot: MetricSnapshot | null;
  observations: Observation[];
  timelineEntries: TimelineEntryWithSource[];
  facts: FactRecord[];
}

/**
 * ContextBuilderService -- pure assembly service.
 *
 * Receives all pre-fetched domain data from KnowledgeService and returns a
 * fully-structured ContextPack. No Prisma, no HTTP, no side effects.
 *
 * Follows the TimelineBuilderService pattern (ADR-004):
 *   - Pure transformation; testable without any mocks.
 *   - KnowledgeService owns all data-fetching; this service owns structure.
 *
 * The evidence map is built from the union of all evidence references across
 * all facts. Each sourceId maps to a human-readable summary and date so the
 * AI layer can trace any fact back to its origin without additional queries.
 * TIMELINE_ENTRY sources are resolved using the timelineEntries in the input.
 */
@Injectable()
export class ContextBuilderService {
  build(input: ContextBuilderInput): ContextPack {
    const { developer, period, snapshot, observations, timelineEntries, facts } = input;

    const evidenceMap = buildEvidenceMap(facts, snapshot, observations, timelineEntries);

    return {
      developer,
      period: {
        start: period.start.toISOString(),
        end: period.end.toISOString(),
      },
      metrics: snapshot ? toContextPackMetrics(snapshot) : null,
      observations: observations.map(toContextPackObservation),
      timeline: timelineEntries.map(toContextPackTimelineEntry),
      facts: facts.map(toContextPackFact),
      evidenceMap,
      generatedAt: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Pure mappers
// ---------------------------------------------------------------------------

function toContextPackMetrics(snapshot: MetricSnapshot): ContextPackMetrics {
  return {
    pullRequestsOpened: snapshot.pullRequestsOpened,
    pullRequestsMerged: snapshot.pullRequestsMerged,
    pullRequestsClosed: snapshot.pullRequestsClosed,
    reviewsGiven: snapshot.reviewsGiven,
    reviewsReceived: snapshot.reviewsReceived,
    averagePrSizeLines: snapshot.averagePrSizeLines,
    averageMergeTimeHours: snapshot.averageMergeTimeHours,
    activeRepositories: snapshot.activeRepositories,
    repoFocus: snapshot.repoFocus as Record<string, number>,
  };
}

function toContextPackObservation(obs: Observation): ContextPackObservation {
  return {
    type: obs.type,
    severity: obs.severity,
    summary: obs.summary,
    detail: obs.detail,
    occurredAt: obs.occurredAt.toISOString(),
  };
}

function toContextPackTimelineEntry(entry: TimelineEntryWithSource): ContextPackTimelineEntry {
  // Derive sourceType and sourceId from the populated FK columns.
  // Exactly one FK is non-null per row (by schema constraint).
  let sourceType = 'unknown';
  let sourceId: string | null = null;

  if (entry.pullRequestId) {
    sourceType = 'pull_request';
    sourceId = entry.pullRequestId;
  } else if (entry.pullRequestReviewId) {
    sourceType = 'pull_request_review';
    sourceId = entry.pullRequestReviewId;
  } else if (entry.observationId) {
    sourceType = 'observation';
    sourceId = entry.observationId;
  } else if (entry.insightId) {
    sourceType = 'insight';
    sourceId = entry.insightId;
  } else if (entry.weeklyReportId) {
    sourceType = 'weekly_report';
    sourceId = entry.weeklyReportId;
  }

  return {
    type: entry.type,
    summary: entry.summary,
    occurredAt: entry.occurredAt.toISOString(),
    sourceType,
    sourceId,
  };
}

function toContextPackFact(fact: FactRecord): ContextPackFact {
  return {
    id: fact.id,
    type: fact.type,
    statement: fact.statement,
    confidence: fact.confidence,
    evidence: fact.evidence as FactEvidence[],
  };
}

// ---------------------------------------------------------------------------
// Evidence map builder
// ---------------------------------------------------------------------------

/**
 * Build an evidence map from all unique evidence references in the fact set.
 *
 * Resolves each sourceId to a human-readable summary using the pre-fetched
 * domain objects:
 *   METRIC_SNAPSHOT -- uses the snapshot summary + period dates
 *   OBSERVATION     -- uses the observation summary + occurredAt
 *   TIMELINE_ENTRY  -- uses the timeline entry summary + occurredAt
 *
 * Truly unresolvable IDs (e.g. stale references to deleted entities) produce
 * a placeholder entry rather than being silently omitted, so the AI layer
 * always receives a complete map even in degraded data scenarios.
 */
function buildEvidenceMap(
  facts: FactRecord[],
  snapshot: MetricSnapshot | null,
  observations: Observation[],
  timelineEntries: TimelineEntryWithSource[],
): EvidenceMap {
  const observationIndex = new Map<string, Observation>(
    observations.map((o) => [o.id, o]),
  );
  const timelineIndex = new Map<string, TimelineEntryWithSource>(
    timelineEntries.map((e) => [e.id, e]),
  );

  const map: EvidenceMap = {};

  for (const fact of facts) {
    const evidenceItems = fact.evidence as FactEvidence[];
    for (const item of evidenceItems) {
      if (map[item.sourceId]) continue; // already resolved

      map[item.sourceId] = resolveEvidence(
        item,
        snapshot,
        observationIndex,
        timelineIndex,
      );
    }
  }

  return map;
}

function resolveEvidence(
  item: FactEvidence,
  snapshot: MetricSnapshot | null,
  observationIndex: Map<string, Observation>,
  timelineIndex: Map<string, TimelineEntryWithSource>,
): EvidenceMapEntry {
  // METRIC_SNAPSHOT
  if (item.sourceType === 'METRIC_SNAPSHOT' && snapshot && item.sourceId === snapshot.id) {
    return {
      sourceType: 'METRIC_SNAPSHOT',
      summary: `Metric snapshot for period ${snapshot.periodStart.toISOString().slice(0, 10)} to ${snapshot.periodEnd.toISOString().slice(0, 10)}`,
      date: snapshot.createdAt.toISOString(),
    };
  }

  // OBSERVATION
  if (item.sourceType === 'OBSERVATION') {
    const obs = observationIndex.get(item.sourceId);
    if (obs) {
      return {
        sourceType: 'OBSERVATION',
        summary: obs.summary,
        date: obs.occurredAt.toISOString(),
      };
    }
  }

  // TIMELINE_ENTRY
  if (item.sourceType === 'TIMELINE_ENTRY') {
    const entry = timelineIndex.get(item.sourceId);
    if (entry) {
      return {
        sourceType: 'TIMELINE_ENTRY',
        summary: entry.summary,
        date: entry.occurredAt.toISOString(),
      };
    }
  }

  // Fallback for truly unresolvable IDs
  return {
    sourceType: item.sourceType,
    summary: `[unresolved ${item.sourceType}]`,
    date: new Date().toISOString(),
  };
}
