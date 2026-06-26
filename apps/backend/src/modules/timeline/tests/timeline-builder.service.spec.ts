import { Test, TestingModule } from '@nestjs/testing';
import { TimelineBuilderService } from '../timeline-builder.service';
import type {
  MetricSnapshotInput,
  ObservationInput,
  PrInput,
  PrReviewInput,
} from '../types/timeline-builder.types';

// ---------------------------------------------------------------------------
// Test fixture factories
// ---------------------------------------------------------------------------

function makePr(overrides: Partial<PrInput> = {}): PrInput {
  return {
    id: 'pr-1',
    developerId: 'dev-1',
    number: 42,
    title: 'Fix authentication bug',
    state: 'MERGED',
    url: 'https://github.com/org/repo/pull/42',
    repositoryFullName: 'org/repo',
    additions: 80,
    deletions: 20,
    mergedAt: new Date('2026-06-10T12:00:00Z'),
    githubCreatedAt: new Date('2026-06-08T09:00:00Z'),
    ...overrides,
  };
}

function makeReview(overrides: Partial<PrReviewInput> = {}): PrReviewInput {
  return {
    id: 'review-1',
    developerId: 'dev-2',
    state: 'APPROVED',
    submittedAt: new Date('2026-06-09T15:00:00Z'),
    reviewerLogin: 'alice',
    pullRequest: {
      number: 42,
      title: 'Fix authentication bug',
      repositoryFullName: 'org/repo',
    },
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<MetricSnapshotInput> = {}): MetricSnapshotInput {
  return {
    id: 'snapshot-1',
    developerId: 'dev-1',
    periodStart: new Date('2026-06-01T00:00:00Z'),
    periodEnd: new Date('2026-06-30T23:59:59Z'),
    pullRequestsOpened: 5,
    pullRequestsMerged: 4,
    pullRequestsClosed: 1,
    averagePrSizeLines: 150.5,
    averageMergeTimeHours: 18.3,
    reviewsGiven: 12,
    reviewsReceived: 8,
    activeRepositories: ['org/repo', 'org/api'],
    repoFocus: { 'org/repo': 3, 'org/api': 1 },
    ...overrides,
  };
}

function makeObservation(overrides: Partial<ObservationInput> = {}): ObservationInput {
  return {
    id: 'obs-1',
    developerId: 'dev-1',
    type: 'CUSTOMER_FEEDBACK',
    severity: 'HIGH',
    summary: 'Customer praised communication during the Q2 demo',
    detail: 'Client specifically mentioned clarity on the API roadmap.',
    occurredAt: new Date('2026-06-15T10:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TimelineBuilderService', () => {
  let builder: TimelineBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimelineBuilderService],
    }).compile();

    builder = module.get<TimelineBuilderService>(TimelineBuilderService);
  });

  // -------------------------------------------------------------------------
  // fromPullRequest
  // -------------------------------------------------------------------------

  describe('fromPullRequest', () => {
    it('produces SIGNAL type and PULL_REQUEST sourceType', () => {
      const entry = builder.fromPullRequest(makePr());
      expect(entry.type).toBe('SIGNAL');
      expect(entry.sourceType).toBe('PULL_REQUEST');
    });

    it('uses mergedAt as occurredAt for merged PRs', () => {
      const pr = makePr({ state: 'MERGED', mergedAt: new Date('2026-06-10T12:00:00Z') });
      const entry = builder.fromPullRequest(pr);
      expect(entry.occurredAt).toEqual(new Date('2026-06-10T12:00:00Z'));
    });

    it('falls back to githubCreatedAt when PR is not merged', () => {
      const pr = makePr({
        state: 'OPEN',
        mergedAt: null,
        githubCreatedAt: new Date('2026-06-08T09:00:00Z'),
      });
      const entry = builder.fromPullRequest(pr);
      expect(entry.occurredAt).toEqual(new Date('2026-06-08T09:00:00Z'));
    });

    it('formats summary as "Merged PR #N: title" for merged PRs', () => {
      const entry = builder.fromPullRequest(makePr({ state: 'MERGED', number: 42, title: 'Fix bug' }));
      expect(entry.summary).toBe('Merged PR #42: Fix bug');
    });

    it('formats summary as "Opened PR #N: title" for open PRs', () => {
      const entry = builder.fromPullRequest(makePr({ state: 'OPEN', mergedAt: null, number: 7 }));
      expect(entry.summary).toBe('Opened PR #7: Fix authentication bug');
    });

    it('formats summary as "Closed PR #N: title" for closed PRs', () => {
      const entry = builder.fromPullRequest(makePr({ state: 'CLOSED', mergedAt: null, number: 3 }));
      expect(entry.summary).toBe('Closed PR #3: Fix authentication bug');
    });

    it('truncates titles longer than 80 characters in summary', () => {
      const longTitle = 'A'.repeat(90);
      const entry = builder.fromPullRequest(makePr({ title: longTitle }));
      expect(entry.summary).toContain('...');
      // summary is "Merged PR #42: " (16 chars) + 80 chars + "..."
      const titlePart = entry.summary.split(': ')[1];
      expect(titlePart.length).toBe(83); // 80 + '...'
    });

    it('computes prSize as additions + deletions', () => {
      const entry = builder.fromPullRequest(makePr({ additions: 80, deletions: 20 }));
      const payload = entry.payload as any;
      expect(payload.prSize).toBe(100);
    });

    it('computes mergeTimeHours from githubCreatedAt to mergedAt', () => {
      const pr = makePr({
        githubCreatedAt: new Date('2026-06-08T00:00:00Z'),
        mergedAt: new Date('2026-06-10T12:00:00Z'), // 60 hours later
      });
      const entry = builder.fromPullRequest(pr);
      const payload = entry.payload as any;
      expect(payload.mergeTimeHours).toBeCloseTo(60, 1);
    });

    it('sets mergeTimeHours to null for unmerged PRs', () => {
      const pr = makePr({ state: 'OPEN', mergedAt: null });
      const entry = builder.fromPullRequest(pr);
      const payload = entry.payload as any;
      expect(payload.mergeTimeHours).toBeNull();
    });

    it('carries sourceId = pr.id and developerId = pr.developerId', () => {
      const entry = builder.fromPullRequest(makePr({ id: 'pr-99', developerId: 'dev-42' }));
      expect(entry.sourceId).toBe('pr-99');
      expect(entry.developerId).toBe('dev-42');
    });
  });

  // -------------------------------------------------------------------------
  // fromPullRequestReview
  // -------------------------------------------------------------------------

  describe('fromPullRequestReview', () => {
    it('produces SIGNAL type and PULL_REQUEST_REVIEW sourceType', () => {
      const entry = builder.fromPullRequestReview(makeReview());
      expect(entry.type).toBe('SIGNAL');
      expect(entry.sourceType).toBe('PULL_REQUEST_REVIEW');
    });

    it('uses submittedAt as occurredAt', () => {
      const review = makeReview({ submittedAt: new Date('2026-06-09T15:00:00Z') });
      const entry = builder.fromPullRequestReview(review);
      expect(entry.occurredAt).toEqual(new Date('2026-06-09T15:00:00Z'));
    });

    it('formats summary as "login approved a PR" for APPROVED state', () => {
      const entry = builder.fromPullRequestReview(makeReview({ state: 'APPROVED', reviewerLogin: 'alice' }));
      expect(entry.summary).toBe('alice approved a PR');
    });

    it('formats summary as "login requested changes on a PR" for CHANGES_REQUESTED', () => {
      const entry = builder.fromPullRequestReview(
        makeReview({ state: 'CHANGES_REQUESTED', reviewerLogin: 'bob' }),
      );
      expect(entry.summary).toBe('bob requested changes on a PR');
    });

    it('formats summary as "login commented on a PR" for COMMENTED', () => {
      const entry = builder.fromPullRequestReview(
        makeReview({ state: 'COMMENTED', reviewerLogin: 'carol' }),
      );
      expect(entry.summary).toBe('carol commented on a PR');
    });

    it('carries pull request context in payload', () => {
      const entry = builder.fromPullRequestReview(makeReview());
      const payload = entry.payload as any;
      expect(payload.pullRequestNumber).toBe(42);
      expect(payload.repositoryFullName).toBe('org/repo');
    });

    it('handles null pullRequest gracefully', () => {
      const entry = builder.fromPullRequestReview(makeReview({ pullRequest: null }));
      const payload = entry.payload as any;
      expect(payload.pullRequestNumber).toBeNull();
      expect(payload.repositoryFullName).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // fromMetricSnapshot
  // -------------------------------------------------------------------------

  describe('fromMetricSnapshot', () => {
    it('produces SIGNAL type and METRIC_SNAPSHOT sourceType', () => {
      const entry = builder.fromMetricSnapshot(makeSnapshot());
      expect(entry.type).toBe('SIGNAL');
      expect(entry.sourceType).toBe('METRIC_SNAPSHOT');
    });

    it('uses periodEnd as occurredAt (sorting convention)', () => {
      const snapshot = makeSnapshot({
        periodEnd: new Date('2026-06-30T23:59:59Z'),
      });
      const entry = builder.fromMetricSnapshot(snapshot);
      expect(entry.occurredAt).toEqual(new Date('2026-06-30T23:59:59Z'));
    });

    it('includes PRs merged, avg merge time, and reviews in summary', () => {
      const entry = builder.fromMetricSnapshot(
        makeSnapshot({ pullRequestsMerged: 4, averageMergeTimeHours: 18.3, reviewsGiven: 12 }),
      );
      expect(entry.summary).toContain('4 PRs merged');
      expect(entry.summary).toContain('18.3h');
      expect(entry.summary).toContain('12 reviews given');
    });

    it('omits avg merge time from summary when null (no merged PRs)', () => {
      const entry = builder.fromMetricSnapshot(
        makeSnapshot({ pullRequestsMerged: 0, averageMergeTimeHours: null }),
      );
      expect(entry.summary).not.toContain('avg merge');
      expect(entry.summary).not.toContain('null');
    });

    it('carries full metric data in payload', () => {
      const snapshot = makeSnapshot();
      const entry = builder.fromMetricSnapshot(snapshot);
      const payload = entry.payload as any;
      expect(payload.pullRequestsMerged).toBe(4);
      expect(payload.reviewsGiven).toBe(12);
      expect(payload.activeRepositories).toEqual(['org/repo', 'org/api']);
      expect(payload.repoFocus).toEqual({ 'org/repo': 3, 'org/api': 1 });
    });

    it('preserves null for averagePrSizeLines and averageMergeTimeHours in payload', () => {
      const snapshot = makeSnapshot({ averagePrSizeLines: null, averageMergeTimeHours: null });
      const entry = builder.fromMetricSnapshot(snapshot);
      const payload = entry.payload as any;
      expect(payload.averagePrSizeLines).toBeNull();
      expect(payload.averageMergeTimeHours).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // fromObservation
  // -------------------------------------------------------------------------

  describe('fromObservation', () => {
    it('produces OBSERVATION type for non-achievement types', () => {
      const entry = builder.fromObservation(makeObservation({ type: 'CUSTOMER_FEEDBACK' }));
      expect(entry.type).toBe('OBSERVATION');
    });

    it('produces ACHIEVEMENT type for ACHIEVEMENT observations', () => {
      const entry = builder.fromObservation(makeObservation({ type: 'ACHIEVEMENT' }));
      expect(entry.type).toBe('ACHIEVEMENT');
    });

    it('always produces OBSERVATION sourceType', () => {
      const entry = builder.fromObservation(makeObservation());
      expect(entry.sourceType).toBe('OBSERVATION');
    });

    it('uses occurredAt as canonical date (not recording date)', () => {
      const obs = makeObservation({ occurredAt: new Date('2026-06-15T10:00:00Z') });
      const entry = builder.fromObservation(obs);
      expect(entry.occurredAt).toEqual(new Date('2026-06-15T10:00:00Z'));
    });

    it('formats summary as "Type label: observation summary"', () => {
      const entry = builder.fromObservation(
        makeObservation({ type: 'CUSTOMER_FEEDBACK', summary: 'Praised clear communication' }),
      );
      expect(entry.summary).toBe('Customer feedback: Praised clear communication');
    });

    it('formats summary correctly for all known observation types', () => {
      const cases: [string, string][] = [
        ['ACHIEVEMENT', 'Achievement'],
        ['COACHING_OPPORTUNITY', 'Coaching opportunity'],
        ['CONCERN', 'Concern'],
        ['LEADERSHIP', 'Leadership'],
        ['MENTORING', 'Mentoring'],
        ['COMMUNICATION', 'Communication'],
        ['INCIDENT', 'Incident'],
        ['OWNERSHIP', 'Ownership'],
        ['CONTEXT', 'Context'],
      ];
      for (const [type, label] of cases) {
        const entry = builder.fromObservation(makeObservation({ type, summary: 'test' }));
        expect(entry.summary).toBe(`${label}: test`);
      }
    });

    it('carries severity and detail in payload', () => {
      const obs = makeObservation({ severity: 'HIGH', detail: 'Extended note' });
      const entry = builder.fromObservation(obs);
      const payload = entry.payload as any;
      expect(payload.severity).toBe('HIGH');
      expect(payload.detail).toBe('Extended note');
    });

    it('carries null detail when not provided', () => {
      const obs = makeObservation({ detail: null });
      const entry = builder.fromObservation(obs);
      const payload = entry.payload as any;
      expect(payload.detail).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // build() -- compositor
  // -------------------------------------------------------------------------

  describe('build', () => {
    it('returns empty array for empty sources', () => {
      expect(builder.build({})).toEqual([]);
    });

    it('returns empty array when all source arrays are empty', () => {
      expect(
        builder.build({ pullRequests: [], metricSnapshots: [], observations: [] }),
      ).toEqual([]);
    });

    it('sorts entries by occurredAt DESC (most recent first)', () => {
      const entries = builder.build({
        pullRequests: [
          makePr({ id: 'pr-old', mergedAt: new Date('2026-05-01T00:00:00Z'), githubCreatedAt: new Date('2026-04-30T00:00:00Z') }),
          makePr({ id: 'pr-new', mergedAt: new Date('2026-06-10T00:00:00Z'), githubCreatedAt: new Date('2026-06-08T00:00:00Z') }),
        ],
      });
      expect(entries[0].sourceId).toBe('pr-new');
      expect(entries[1].sourceId).toBe('pr-old');
    });

    it('merges entries from all source types into a single sorted list', () => {
      const result = builder.build({
        pullRequests: [makePr({ id: 'pr-1', mergedAt: new Date('2026-06-10T00:00:00Z'), githubCreatedAt: new Date('2026-06-08T00:00:00Z') })],
        metricSnapshots: [makeSnapshot({ id: 'snap-1', periodEnd: new Date('2026-06-30T00:00:00Z') })],
        observations: [makeObservation({ id: 'obs-1', occurredAt: new Date('2026-06-15T00:00:00Z') })],
      });

      expect(result).toHaveLength(3);
      // snapshot (Jun 30) > observation (Jun 15) > PR (Jun 10)
      expect(result[0].sourceId).toBe('snap-1');
      expect(result[1].sourceId).toBe('obs-1');
      expect(result[2].sourceId).toBe('pr-1');
    });

    it('places OBSERVATION before SIGNAL at identical occurredAt (tie-break)', () => {
      const sharedDate = new Date('2026-06-15T00:00:00Z');
      const result = builder.build({
        pullRequests: [
          makePr({ id: 'pr-same', mergedAt: sharedDate, githubCreatedAt: sharedDate }),
        ],
        observations: [
          makeObservation({ id: 'obs-same', occurredAt: sharedDate }),
        ],
      });
      expect(result[0].sourceType).toBe('OBSERVATION');
      expect(result[1].sourceType).toBe('PULL_REQUEST');
    });

    it('handles undefined source arrays gracefully', () => {
      // Only pullRequests provided -- no observations or snapshots
      const result = builder.build({
        pullRequests: [makePr()],
      });
      expect(result).toHaveLength(1);
      expect(result[0].sourceType).toBe('PULL_REQUEST');
    });
  });
});
