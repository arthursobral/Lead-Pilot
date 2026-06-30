import { ContextBuilderService } from '../context-builder.service';
import type { ContextBuilderInput } from '../context-builder.service';
import { FactType } from '../../facts/types/facts.types';
import { FactConfidence, ObservationType, ObservationSeverity } from '@prisma/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEV_ID = 'dev-1';
const PERIOD_START = new Date('2026-06-01T00:00:00Z');
const PERIOD_END = new Date('2026-07-01T00:00:00Z');

function makeDeveloper() {
  return {
    id: DEV_ID,
    name: 'Alice',
    githubLogin: 'alice',
    role: 'Backend Engineer',
  };
}

function makeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    id: 'snap-1',
    developerId: DEV_ID,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    pullRequestsOpened: 5,
    pullRequestsMerged: 8,
    pullRequestsClosed: 1,
    averagePrSizeLines: 200,
    averageMergeTimeHours: 4,
    reviewsGiven: 12,
    reviewsReceived: 3,
    activeRepositories: ['api-gateway'],
    repoFocus: { 'api-gateway': 8 },
    createdAt: new Date('2026-07-01T00:00:00Z'),
    ...overrides,
  } as any;
}

function makeObservation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'obs-1',
    developerId: DEV_ID,
    teamLeadId: 'tl-1',
    type: ObservationType.ACHIEVEMENT,
    severity: ObservationSeverity.HIGH,
    summary: 'Led a major incident response',
    detail: null,
    occurredAt: new Date('2026-06-15T10:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as any;
}

function makeTimelineEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tl-1',
    developerId: DEV_ID,
    type: 'OBSERVATION',
    summary: 'Led a major incident response',
    occurredAt: new Date('2026-06-15T10:00:00Z'),
    createdAt: new Date(),
    pullRequestId: null,
    pullRequestReviewId: null,
    observationId: 'obs-1',
    insightId: null,
    weeklyReportId: null,
    pullRequest: null,
    pullRequestReview: null,
    observation: null,
    insight: null,
    weeklyReport: null,
    ...overrides,
  } as any;
}

function makeFact(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fact-1',
    developerId: DEV_ID,
    type: FactType.ACTIVITY_SIGNAL,
    statement: 'Merged 8 pull requests between 2026-06-01 and 2026-07-01.',
    confidence: FactConfidence.HIGH,
    evidence: [{ sourceType: 'METRIC_SNAPSHOT', sourceId: 'snap-1' }],
    dedupKey: `${DEV_ID}:ACTIVITY_SIGNAL:snap-1:2026-06-01`,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as any;
}

function makeInput(overrides: Partial<ContextBuilderInput> = {}): ContextBuilderInput {
  return {
    developer: makeDeveloper(),
    period: { start: PERIOD_START, end: PERIOD_END },
    snapshot: makeSnapshot(),
    observations: [makeObservation()],
    timelineEntries: [makeTimelineEntry()],
    facts: [makeFact()],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ContextBuilderService', () => {
  let service: ContextBuilderService;

  beforeEach(() => {
    // No DI needed -- ContextBuilderService is a pure transformation service.
    service = new ContextBuilderService();
  });

  // ---------------------------------------------------------------------------
  // Developer field
  // ---------------------------------------------------------------------------

  describe('developer', () => {
    it('includes developer profile in the pack', () => {
      const pack = service.build(makeInput());

      expect(pack.developer.id).toBe(DEV_ID);
      expect(pack.developer.name).toBe('Alice');
      expect(pack.developer.githubLogin).toBe('alice');
      expect(pack.developer.role).toBe('Backend Engineer');
    });

    it('accepts null role', () => {
      const pack = service.build(makeInput({
        developer: { ...makeDeveloper(), role: null },
      }));

      expect(pack.developer.role).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Period field
  // ---------------------------------------------------------------------------

  describe('period', () => {
    it('converts period dates to ISO strings', () => {
      const pack = service.build(makeInput());

      expect(pack.period.start).toBe(PERIOD_START.toISOString());
      expect(pack.period.end).toBe(PERIOD_END.toISOString());
    });
  });

  // ---------------------------------------------------------------------------
  // Metrics field
  // ---------------------------------------------------------------------------

  describe('metrics', () => {
    it('maps snapshot to ContextPackMetrics', () => {
      const pack = service.build(makeInput());

      expect(pack.metrics).not.toBeNull();
      expect(pack.metrics!.pullRequestsMerged).toBe(8);
      expect(pack.metrics!.reviewsGiven).toBe(12);
      expect(pack.metrics!.averagePrSizeLines).toBe(200);
    });

    it('sets metrics to null when no snapshot', () => {
      const pack = service.build(makeInput({ snapshot: null }));

      expect(pack.metrics).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Observations field
  // ---------------------------------------------------------------------------

  describe('observations', () => {
    it('maps observations to ContextPackObservation', () => {
      const pack = service.build(makeInput());

      expect(pack.observations).toHaveLength(1);
      expect(pack.observations[0].type).toBe(ObservationType.ACHIEVEMENT);
      expect(pack.observations[0].severity).toBe(ObservationSeverity.HIGH);
      expect(pack.observations[0].summary).toBe('Led a major incident response');
      expect(pack.observations[0].occurredAt).toBe(new Date('2026-06-15T10:00:00Z').toISOString());
    });

    it('returns empty observations array when none in period', () => {
      const pack = service.build(makeInput({ observations: [] }));

      expect(pack.observations).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Timeline field
  // ---------------------------------------------------------------------------

  describe('timeline', () => {
    it('maps timeline entries to ContextPackTimelineEntry', () => {
      const pack = service.build(makeInput());

      expect(pack.timeline).toHaveLength(1);
      expect(pack.timeline[0].type).toBe('OBSERVATION');
      expect(pack.timeline[0].summary).toBe('Led a major incident response');
      expect(pack.timeline[0].sourceType).toBe('observation');
      expect(pack.timeline[0].sourceId).toBe('obs-1');
    });

    it('derives sourceType=pull_request when pullRequestId is set', () => {
      const entry = makeTimelineEntry({
        pullRequestId: 'pr-1',
        observationId: null,
        type: 'SIGNAL',
        summary: 'Merged PR #42',
      });
      const pack = service.build(makeInput({ timelineEntries: [entry] }));

      expect(pack.timeline[0].sourceType).toBe('pull_request');
      expect(pack.timeline[0].sourceId).toBe('pr-1');
    });

    it('derives sourceType=pull_request_review when pullRequestReviewId is set', () => {
      const entry = makeTimelineEntry({
        pullRequestReviewId: 'review-1',
        observationId: null,
        type: 'SIGNAL',
        summary: 'Reviewed PR #15',
      });
      const pack = service.build(makeInput({ timelineEntries: [entry] }));

      expect(pack.timeline[0].sourceType).toBe('pull_request_review');
    });

    it('returns empty timeline when no entries in period', () => {
      const pack = service.build(makeInput({ timelineEntries: [] }));

      expect(pack.timeline).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Facts field
  // ---------------------------------------------------------------------------

  describe('facts', () => {
    it('maps facts to ContextPackFact', () => {
      const pack = service.build(makeInput());

      expect(pack.facts).toHaveLength(1);
      expect(pack.facts[0].id).toBe('fact-1');
      expect(pack.facts[0].type).toBe(FactType.ACTIVITY_SIGNAL);
      expect(pack.facts[0].statement).toContain('8 pull requests');
      expect(pack.facts[0].confidence).toBe(FactConfidence.HIGH);
      expect(pack.facts[0].evidence).toHaveLength(1);
    });

    it('returns empty facts array when none in period', () => {
      const pack = service.build(makeInput({ facts: [] }));

      expect(pack.facts).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Evidence map
  // ---------------------------------------------------------------------------

  describe('evidenceMap', () => {
    it('builds evidence map from METRIC_SNAPSHOT evidence', () => {
      const pack = service.build(makeInput());

      expect(pack.evidenceMap['snap-1']).toBeDefined();
      expect(pack.evidenceMap['snap-1'].sourceType).toBe('METRIC_SNAPSHOT');
      expect(pack.evidenceMap['snap-1'].summary).toContain('2026-06-01');
    });

    it('builds evidence map from OBSERVATION evidence', () => {
      const obs = makeObservation({ id: 'obs-1', summary: 'Customer praised the work' });
      const fact = makeFact({
        type: FactType.ACHIEVEMENT,
        evidence: [{ sourceType: 'OBSERVATION', sourceId: 'obs-1' }],
      });
      const pack = service.build(makeInput({
        observations: [obs],
        facts: [fact],
        snapshot: null,
      }));

      expect(pack.evidenceMap['obs-1']).toBeDefined();
      expect(pack.evidenceMap['obs-1'].sourceType).toBe('OBSERVATION');
      expect(pack.evidenceMap['obs-1'].summary).toBe('Customer praised the work');
    });

    it('builds evidence map from TIMELINE_ENTRY evidence', () => {
      const entry = makeTimelineEntry({
        id: 'tl-1',
        summary: 'Led the architecture review session.',
        occurredAt: new Date('2026-06-20T10:00:00Z'),
      });
      const fact = makeFact({
        type: FactType.ACTIVITY_SIGNAL,
        evidence: [{ sourceType: 'TIMELINE_ENTRY', sourceId: 'tl-1' }],
      });
      const pack = service.build(makeInput({
        timelineEntries: [entry],
        facts: [fact],
        snapshot: null,
      }));

      expect(pack.evidenceMap['tl-1']).toBeDefined();
      expect(pack.evidenceMap['tl-1'].sourceType).toBe('TIMELINE_ENTRY');
      expect(pack.evidenceMap['tl-1'].summary).toBe('Led the architecture review session.');
      expect(new Date(pack.evidenceMap['tl-1'].date).toISOString()).toBe('2026-06-20T10:00:00.000Z');
    });

    it('deduplicates evidence map entries when multiple facts share a source', () => {
      const fact1 = makeFact({ id: 'fact-1', type: FactType.ACTIVITY_SIGNAL });
      const fact2 = makeFact({
        id: 'fact-2',
        type: FactType.COLLABORATION_SIGNAL,
        dedupKey: 'dev-1:COLLABORATION_SIGNAL:snap-1:2026-06-01',
        evidence: [{ sourceType: 'METRIC_SNAPSHOT', sourceId: 'snap-1' }],
      });
      const pack = service.build(makeInput({ facts: [fact1, fact2] }));

      // snap-1 should appear exactly once
      expect(Object.keys(pack.evidenceMap)).toHaveLength(1);
    });

    it('returns empty evidenceMap when there are no facts', () => {
      const pack = service.build(makeInput({ facts: [] }));

      expect(pack.evidenceMap).toEqual({});
    });

    it('produces a fallback entry for unresolvable evidence', () => {
      const fact = makeFact({
        evidence: [{ sourceType: 'METRIC_SNAPSHOT', sourceId: 'snap-UNKNOWN' }],
      });
      const pack = service.build(makeInput({ facts: [fact] }));

      expect(pack.evidenceMap['snap-UNKNOWN']).toBeDefined();
      expect(pack.evidenceMap['snap-UNKNOWN'].summary).toContain('[unresolved');
    });
  });

  // ---------------------------------------------------------------------------
  // generatedAt
  // ---------------------------------------------------------------------------

  describe('generatedAt', () => {
    it('is a valid ISO 8601 string', () => {
      const before = new Date();
      const pack = service.build(makeInput());
      const after = new Date();

      const ts = new Date(pack.generatedAt);
      expect(ts.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(ts.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
