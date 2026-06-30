import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { MetricSnapshot, Observation } from '@prisma/client';
import { FactConfidence, ObservationType, ObservationSeverity } from '@prisma/client';
import { DevelopersService } from '../developers/developers.service';
import { MetricsService } from '../metrics/metrics.service';
import { ObservationsRepository } from '../observations/observations.repository';
import { TimelineRepository } from '../timeline/timeline.repository';
import { FactsRepository } from './facts.repository';
import type { FactResponseDto, PaginatedFactsResponseDto } from './dto/fact-response.dto';
import { FactType } from './types/facts.types';
import type {
  FactEvidence,
  FactRecord,
  ListFactsOptions,
  UpsertFactData,
} from './types/facts.types';
import type { TimelineEntryWithSource } from '../timeline/types/timeline.types';

// ---------------------------------------------------------------------------
// Observation type sets
// ---------------------------------------------------------------------------

const ACHIEVEMENT_TYPES = new Set<ObservationType>([
  ObservationType.ACHIEVEMENT,
  ObservationType.LEADERSHIP,
  ObservationType.MENTORING,
]);

const COACHING_TYPES = new Set<ObservationType>([
  ObservationType.COACHING_OPPORTUNITY,
  ObservationType.CONCERN,
]);

// Human-readable labels for observation types (used in aggregate statements)
const OBS_TYPE_LABEL: Record<string, string> = {
  ACHIEVEMENT: 'achievement',
  CUSTOMER_FEEDBACK: 'customer feedback',
  COACHING_OPPORTUNITY: 'coaching opportunity',
  CONCERN: 'concern',
  LEADERSHIP: 'leadership',
  MENTORING: 'mentoring',
  COMMUNICATION: 'communication',
  INCIDENT: 'incident',
  OWNERSHIP: 'ownership',
  CONTEXT: 'context',
};

// Timeline types considered "notable" for the most-recent-event rule
const NOTABLE_TIMELINE_TYPES = new Set(['ACHIEVEMENT', 'OBSERVATION']);

/**
 * FactsService -- the Fact domain service.
 *
 * Responsibilities:
 *   1. generate() -- extract structured Facts from MetricSnapshots, Observations,
 *      and TimelineEntries for a given period. Idempotent via dedupKey upsert.
 *   2. list() -- paginated read of stored Facts for a developer.
 *   3. findByPeriod() -- fetch all facts in a period (used by KnowledgeService
 *      when assembling ContextPacks for the AI layer).
 *
 * Extraction rules (ADR-006, rule set v2 -- Day 6):
 *
 *   MetricSnapshot (7 rules):
 *     Rule 1  ACTIVITY_SIGNAL      -- merged PR count       (pullRequestsMerged > 0)
 *     Rule 2  ACTIVITY_SIGNAL      -- opened PR count       (pullRequestsOpened > 0)
 *     Rule 3  COLLABORATION_SIGNAL -- reviews given         (reviewsGiven > 0)
 *     Rule 4  COLLABORATION_SIGNAL -- reviews received      (reviewsReceived > 0)
 *     Rule 5  METRIC_PATTERN       -- average PR size       (averagePrSizeLines != null)
 *     Rule 6  METRIC_PATTERN       -- average merge time    (averageMergeTimeHours != null)
 *     Rule 7  METRIC_PATTERN       -- repository focus      (repoFocus has entries)
 *
 *   Observations -- per-record (3 rules):
 *     Rule 8  ACHIEVEMENT          -- from ACHIEVEMENT / LEADERSHIP / MENTORING
 *     Rule 9  COACHING_SIGNAL      -- from COACHING_OPPORTUNITY / CONCERN
 *     Rule 10 OBSERVATION_FACT     -- from all other types
 *
 *   Observations -- aggregate (2 rules):
 *     Rule 11 OBSERVATION_FACT     -- count by type (when count >= 2 for a type)
 *     Rule 12 OBSERVATION_FACT     -- high-severity count (when any HIGH severity exists)
 *
 *   Timeline (2 rules):
 *     Rule 13 ACTIVITY_SIGNAL      -- total entry count    (when entries > 0)
 *     Rule 14 OBSERVATION_FACT     -- most recent notable event (ACHIEVEMENT or OBSERVATION type)
 *
 * dedupKey format: {developerId}:{factType}:{rule}:{sourceId|qualifier}:{periodStart(date)}
 * This format accommodates multiple facts of the same FactType from the same source.
 *
 * Constraints (ADR-005):
 *   - No ranking or scoring.
 *   - No performance judgments.
 *   - No productivity conclusions.
 *   - Facts are evidence-backed statements, not AI insights.
 */
@Injectable()
export class FactsService {
  private readonly logger = new Logger(FactsService.name);

  constructor(
    private readonly developersService: DevelopersService,
    private readonly metricsService: MetricsService,
    private readonly observationsRepository: ObservationsRepository,
    private readonly timelineRepository: TimelineRepository,
    private readonly factsRepository: FactsRepository,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Extract and persist structured Facts for a developer over a period.
   * Safe to call multiple times -- idempotent via dedupKey upsert.
   */
  async generate(
    developerId: string,
    teamLeadId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<FactResponseDto[]> {
    await this.assertDeveloperExists(developerId, teamLeadId);

    const [snapshot, observations, timelineEntries] = await Promise.all([
      this.metricsService.getSnapshotForPeriod(developerId, periodStart, periodEnd),
      this.observationsRepository.findAllByDeveloperAndPeriod(developerId, periodStart, periodEnd),
      this.timelineRepository.findByDeveloperAndPeriod(developerId, periodStart, periodEnd),
    ]);

    const upsertJobs: UpsertFactData[] = [
      ...this.extractFromSnapshot(developerId, snapshot, periodStart, periodEnd),
      ...this.extractFromObservations(developerId, observations, periodStart, periodEnd),
      ...this.extractFromTimeline(developerId, timelineEntries, periodStart, periodEnd),
    ];

    this.logger.log(
      `Generating ${upsertJobs.length} facts for developer=${developerId} ` +
        `period=[${periodStart.toISOString()} to ${periodEnd.toISOString()}]`,
    );

    const facts = await Promise.all(
      upsertJobs.map((job) => this.factsRepository.upsertFact(job)),
    );

    return facts.map(toFactDto);
  }

  /**
   * Return a paginated list of stored Facts for a developer.
   */
  async list(
    developerId: string,
    teamLeadId: string,
    options: ListFactsOptions,
  ): Promise<PaginatedFactsResponseDto> {
    await this.assertDeveloperExists(developerId, teamLeadId);

    const result = await this.factsRepository.findByDeveloper(developerId, options);

    return {
      data: result.data.map(toFactDto),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * Return all facts for a developer within a specific period.
   * Used by KnowledgeService when assembling ContextPacks.
   */
  async findByPeriod(
    developerId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<FactRecord[]> {
    return this.factsRepository.findByDeveloperAndPeriod(developerId, periodStart, periodEnd);
  }

  // ---------------------------------------------------------------------------
  // Extraction rules -- MetricSnapshot (ADR-006 rule set v2, Rules 1-7)
  // ---------------------------------------------------------------------------

  private extractFromSnapshot(
    developerId: string,
    snapshot: MetricSnapshot | null,
    periodStart: Date,
    periodEnd: Date,
  ): UpsertFactData[] {
    if (!snapshot) return [];

    const facts: UpsertFactData[] = [];
    const k = periodStart.toISOString().slice(0, 10);
    const label = formatPeriodLabel(periodStart, periodEnd);
    const ev: FactEvidence[] = [{ sourceType: 'METRIC_SNAPSHOT', sourceId: snapshot.id }];

    // Rule 1: PRs merged
    if (snapshot.pullRequestsMerged > 0) {
      const n = snapshot.pullRequestsMerged;
      facts.push({
        developerId,
        type: FactType.ACTIVITY_SIGNAL,
        statement: `Merged ${n} pull request${n === 1 ? '' : 's'} ${label}.`,
        confidence: activityConfidence(n),
        evidence: ev,
        dedupKey: `${developerId}:ACTIVITY_SIGNAL:MERGED_PRS:${snapshot.id}:${k}`,
        periodStart,
        periodEnd,
      });
    }

    // Rule 2: PRs opened
    if (snapshot.pullRequestsOpened > 0) {
      const n = snapshot.pullRequestsOpened;
      facts.push({
        developerId,
        type: FactType.ACTIVITY_SIGNAL,
        statement: `Opened ${n} pull request${n === 1 ? '' : 's'} ${label}.`,
        confidence: activityConfidence(n),
        evidence: ev,
        dedupKey: `${developerId}:ACTIVITY_SIGNAL:OPENED_PRS:${snapshot.id}:${k}`,
        periodStart,
        periodEnd,
      });
    }

    // Rule 3: Reviews given
    if (snapshot.reviewsGiven > 0) {
      const n = snapshot.reviewsGiven;
      facts.push({
        developerId,
        type: FactType.COLLABORATION_SIGNAL,
        statement: `Gave ${n} code review${n === 1 ? '' : 's'} ${label}.`,
        confidence: collaborationConfidence(n),
        evidence: ev,
        dedupKey: `${developerId}:COLLABORATION_SIGNAL:REVIEWS_GIVEN:${snapshot.id}:${k}`,
        periodStart,
        periodEnd,
      });
    }

    // Rule 4: Reviews received
    if (snapshot.reviewsReceived > 0) {
      const n = snapshot.reviewsReceived;
      facts.push({
        developerId,
        type: FactType.COLLABORATION_SIGNAL,
        statement: `Received ${n} code review${n === 1 ? '' : 's'} ${label}.`,
        confidence: collaborationConfidence(n),
        evidence: ev,
        dedupKey: `${developerId}:COLLABORATION_SIGNAL:REVIEWS_RECEIVED:${snapshot.id}:${k}`,
        periodStart,
        periodEnd,
      });
    }

    // Rule 5: Average PR size
    if (snapshot.averagePrSizeLines != null) {
      const lines = Math.round(snapshot.averagePrSizeLines);
      facts.push({
        developerId,
        type: FactType.METRIC_PATTERN,
        statement: `Average PR size was ${lines} line${lines === 1 ? '' : 's'} ${label}.`,
        confidence: FactConfidence.HIGH,
        evidence: ev,
        dedupKey: `${developerId}:METRIC_PATTERN:AVG_PR_SIZE:${snapshot.id}:${k}`,
        periodStart,
        periodEnd,
      });
    }

    // Rule 6: Average merge time
    if (snapshot.averageMergeTimeHours != null) {
      const hours = Math.round(snapshot.averageMergeTimeHours * 10) / 10;
      facts.push({
        developerId,
        type: FactType.METRIC_PATTERN,
        statement: `Average merge time was ${hours} hour${hours === 1 ? '' : 's'} ${label}.`,
        confidence: FactConfidence.HIGH,
        evidence: ev,
        dedupKey: `${developerId}:METRIC_PATTERN:AVG_MERGE_TIME:${snapshot.id}:${k}`,
        periodStart,
        periodEnd,
      });
    }

    // Rule 7: Repository focus (top repository by contribution count)
    const repoFocus = snapshot.repoFocus as Record<string, number> | null;
    if (repoFocus != null && Object.keys(repoFocus).length > 0) {
      const sorted = Object.entries(repoFocus).sort(([, a], [, b]) => b - a);
      const [topRepo, topCount] = sorted[0];
      const repoCount = Object.keys(repoFocus).length;
      const repoDetail =
        repoCount > 1
          ? `${topRepo} (${topCount} contribution${topCount === 1 ? '' : 's'}, ${repoCount} repositories active)`
          : `${topRepo} (${topCount} contribution${topCount === 1 ? '' : 's'})`;
      facts.push({
        developerId,
        type: FactType.METRIC_PATTERN,
        statement: `Primary repository focus was ${repoDetail} ${label}.`,
        confidence: FactConfidence.HIGH,
        evidence: ev,
        dedupKey: `${developerId}:METRIC_PATTERN:REPO_FOCUS:${snapshot.id}:${k}`,
        periodStart,
        periodEnd,
      });
    }

    return facts;
  }

  // ---------------------------------------------------------------------------
  // Extraction rules -- Observations (ADR-006 rule set v2, Rules 8-12)
  // ---------------------------------------------------------------------------

  private extractFromObservations(
    developerId: string,
    observations: Observation[],
    periodStart: Date,
    periodEnd: Date,
  ): UpsertFactData[] {
    if (observations.length === 0) return [];

    const k = periodStart.toISOString().slice(0, 10);
    const label = formatPeriodLabel(periodStart, periodEnd);

    // Rules 8-10: one fact per observation
    const perObsFacts: UpsertFactData[] = observations.map((obs) => {
      const factType = resolveObservationFactType(obs.type);
      const confidence = COACHING_TYPES.has(obs.type)
        ? FactConfidence.MEDIUM
        : FactConfidence.HIGH;

      return {
        developerId,
        type: factType,
        statement: obs.summary,
        confidence,
        evidence: [{ sourceType: 'OBSERVATION' as const, sourceId: obs.id }],
        dedupKey: `${developerId}:${factType}:OBS:${obs.id}:${k}`,
        periodStart,
        periodEnd,
      };
    });

    const aggregateFacts: UpsertFactData[] = [];

    // Rule 11: count-by-type aggregate facts (for types with 2+ observations)
    const byType = groupByObsType(observations);
    for (const [type, group] of Object.entries(byType)) {
      if (group.length < 2) continue;
      const n = group.length;
      const typeLabel = OBS_TYPE_LABEL[type] ?? type.toLowerCase().replace(/_/g, ' ');
      aggregateFacts.push({
        developerId,
        type: FactType.OBSERVATION_FACT,
        statement: `${n} ${typeLabel} observation${n === 1 ? '' : 's'} were recorded ${label}.`,
        confidence: FactConfidence.HIGH,
        evidence: group.map((o) => ({ sourceType: 'OBSERVATION' as const, sourceId: o.id })),
        dedupKey: `${developerId}:OBSERVATION_FACT:COUNT:${type}:${k}`,
        periodStart,
        periodEnd,
      });
    }

    // Rule 12: high-severity observation count (when any HIGH severity exists)
    const highSeverity = observations.filter((o) => o.severity === ObservationSeverity.HIGH);
    if (highSeverity.length > 0) {
      const n = highSeverity.length;
      aggregateFacts.push({
        developerId,
        type: FactType.OBSERVATION_FACT,
        statement: `${n} high-severity observation${n === 1 ? '' : 's'} were recorded ${label}.`,
        confidence: FactConfidence.HIGH,
        evidence: highSeverity.map((o) => ({
          sourceType: 'OBSERVATION' as const,
          sourceId: o.id,
        })),
        dedupKey: `${developerId}:OBSERVATION_FACT:HIGH_SEVERITY:${k}`,
        periodStart,
        periodEnd,
      });
    }

    return [...perObsFacts, ...aggregateFacts];
  }

  // ---------------------------------------------------------------------------
  // Extraction rules -- Timeline (ADR-006 rule set v2, Rules 13-14)
  // ---------------------------------------------------------------------------

  private extractFromTimeline(
    developerId: string,
    timelineEntries: TimelineEntryWithSource[],
    periodStart: Date,
    periodEnd: Date,
  ): UpsertFactData[] {
    if (timelineEntries.length === 0) return [];

    const k = periodStart.toISOString().slice(0, 10);
    const label = formatPeriodLabel(periodStart, periodEnd);
    const facts: UpsertFactData[] = [];

    // Rule 13: total timeline entry count
    // timelineEntries is ordered ASC (chronological); first and last bookend the evidence
    const n = timelineEntries.length;
    const first = timelineEntries[0];
    const last = timelineEntries[n - 1];
    const countEvidence: FactEvidence[] = [
      { sourceType: 'TIMELINE_ENTRY', sourceId: first.id },
    ];
    if (last.id !== first.id) {
      countEvidence.push({ sourceType: 'TIMELINE_ENTRY', sourceId: last.id });
    }
    facts.push({
      developerId,
      type: FactType.ACTIVITY_SIGNAL,
      statement: `${n} activity entr${n === 1 ? 'y was' : 'ies were'} recorded in the timeline ${label}.`,
      confidence: FactConfidence.HIGH,
      evidence: countEvidence,
      dedupKey: `${developerId}:ACTIVITY_SIGNAL:TIMELINE_COUNT:${k}`,
      periodStart,
      periodEnd,
    });

    // Rule 14: most recent notable event (ACHIEVEMENT or OBSERVATION type entries)
    // timelineEntries is ASC, so the last notable entry is the most recent
    const notable = timelineEntries.filter((e) => NOTABLE_TIMELINE_TYPES.has(e.type));
    if (notable.length > 0) {
      const mostRecent = notable[notable.length - 1];
      const dateLabel = mostRecent.occurredAt.toISOString().slice(0, 10);
      facts.push({
        developerId,
        type: FactType.OBSERVATION_FACT,
        statement: `Most recent notable event: "${mostRecent.summary}" (recorded on ${dateLabel}).`,
        confidence: FactConfidence.HIGH,
        evidence: [{ sourceType: 'TIMELINE_ENTRY', sourceId: mostRecent.id }],
        dedupKey: `${developerId}:OBSERVATION_FACT:TIMELINE_RECENT:${k}`,
        periodStart,
        periodEnd,
      });
    }

    return facts;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async assertDeveloperExists(
    developerId: string,
    teamLeadId: string,
  ): Promise<void> {
    const developer = await this.developersService
      .findById(developerId, teamLeadId)
      .catch(() => null);
    if (!developer) {
      throw new NotFoundException(`Developer ${developerId} not found`);
    }
  }
}

// ---------------------------------------------------------------------------
// Pure helper functions (no side effects)
// ---------------------------------------------------------------------------

function activityConfidence(n: number): FactConfidence {
  if (n > 5) return FactConfidence.HIGH;
  if (n >= 2) return FactConfidence.MEDIUM;
  return FactConfidence.LOW;
}

function collaborationConfidence(n: number): FactConfidence {
  if (n > 10) return FactConfidence.HIGH;
  if (n >= 3) return FactConfidence.MEDIUM;
  return FactConfidence.LOW;
}

function resolveObservationFactType(obsType: ObservationType): FactType {
  if (ACHIEVEMENT_TYPES.has(obsType)) return FactType.ACHIEVEMENT;
  if (COACHING_TYPES.has(obsType)) return FactType.COACHING_SIGNAL;
  return FactType.OBSERVATION_FACT;
}

function formatPeriodLabel(start: Date, end: Date): string {
  const s = start.toISOString().slice(0, 10);
  const e = end.toISOString().slice(0, 10);
  return `between ${s} and ${e}`;
}

function groupByObsType(observations: Observation[]): Record<string, Observation[]> {
  return observations.reduce<Record<string, Observation[]>>((acc, obs) => {
    const key = obs.type as string;
    if (!acc[key]) acc[key] = [];
    acc[key].push(obs);
    return acc;
  }, {});
}

export function toFactDto(fact: FactRecord): FactResponseDto {
  return {
    id: fact.id,
    developerId: fact.developerId,
    type: fact.type,
    statement: fact.statement,
    confidence: fact.confidence,
    evidence: fact.evidence as FactEvidence[],
    dedupKey: fact.dedupKey,
    periodStart: fact.periodStart.toISOString(),
    periodEnd: fact.periodEnd.toISOString(),
    createdAt: fact.createdAt.toISOString(),
    updatedAt: fact.updatedAt.toISOString(),
  };
}
