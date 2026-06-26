import { toTimelineEntryDto, toPaginatedTimelineResponse } from '../timeline.mapper';
import type { TimelineEntryWithSource, PaginatedTimeline } from '../types/timeline.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<TimelineEntryWithSource> = {}): TimelineEntryWithSource {
  return {
    id: 'entry-1',
    developerId: 'dev-1',
    type: 'SIGNAL' as any,
    summary: 'Merged PR #1: Fix bug',
    occurredAt: new Date('2026-06-01T12:00:00.000Z'),
    createdAt: new Date('2026-06-01T12:05:00.000Z'),
    pullRequestId: null,
    pullRequestReviewId: null,
    observationId: null,
    insightId: null,
    weeklyReportId: null,
    pullRequest: null,
    pullRequestReview: null,
    observation: null,
    ...overrides,
  };
}

function makePullRequest() {
  return {
    id: 'pr-1',
    number: 42,
    title: 'Fix critical bug in auth middleware',
    state: 'MERGED',
    url: 'https://github.com/org/repo/pull/42',
    repositoryFullName: 'org/repo',
    additions: 120,
    deletions: 45,
    mergedAt: new Date('2026-06-01T11:00:00.000Z'),
    githubCreatedAt: new Date('2026-05-30T09:00:00.000Z'),
  };
}

function makeReview() {
  return {
    id: 'review-1',
    state: 'APPROVED',
    body: 'LGTM, nice clean solution',
    submittedAt: new Date('2026-06-01T10:30:00.000Z'),
    pullRequest: {
      number: 42,
      title: 'Fix critical bug in auth middleware',
      repositoryFullName: 'org/repo',
    },
  };
}

function makeObservation() {
  return {
    id: 'obs-1',
    type: 'ACHIEVEMENT',
    severity: 'HIGH',
    detail: 'Led cross-team incident response effectively',
    occurredAt: new Date('2026-06-01T08:00:00.000Z'),
  };
}

// ---------------------------------------------------------------------------
// toTimelineEntryDto
// ---------------------------------------------------------------------------

describe('toTimelineEntryDto', () => {
  describe('scalar field mapping', () => {
    it('maps id, developerId, type, summary', () => {
      const entry = makeEntry();
      const dto = toTimelineEntryDto(entry);

      expect(dto.id).toBe('entry-1');
      expect(dto.developerId).toBe('dev-1');
      expect(dto.type).toBe('SIGNAL');
      expect(dto.summary).toBe('Merged PR #1: Fix bug');
    });

    it('serializes occurredAt to ISO 8601 string', () => {
      const entry = makeEntry({ occurredAt: new Date('2026-06-01T12:00:00.000Z') });
      const dto = toTimelineEntryDto(entry);

      expect(dto.occurredAt).toBe('2026-06-01T12:00:00.000Z');
    });

    it('serializes createdAt to ISO 8601 string', () => {
      const entry = makeEntry({ createdAt: new Date('2026-06-01T12:05:00.000Z') });
      const dto = toTimelineEntryDto(entry);

      expect(dto.createdAt).toBe('2026-06-01T12:05:00.000Z');
    });
  });

  // -------------------------------------------------------------------------
  // Source derivation
  // -------------------------------------------------------------------------

  describe('source derivation', () => {
    it('returns null when no FK is populated (sourceless entry)', () => {
      const entry = makeEntry();
      expect(toTimelineEntryDto(entry).source).toBeNull();
    });

    it('returns "pull_request" when pullRequestId is set', () => {
      const entry = makeEntry({ pullRequestId: 'pr-1', pullRequest: makePullRequest() });
      expect(toTimelineEntryDto(entry).source).toBe('pull_request');
    });

    it('returns "pull_request_review" when pullRequestReviewId is set', () => {
      const entry = makeEntry({
        pullRequestReviewId: 'review-1',
        pullRequestReview: makeReview(),
      });
      expect(toTimelineEntryDto(entry).source).toBe('pull_request_review');
    });

    it('returns "observation" when observationId is set', () => {
      const entry = makeEntry({ observationId: 'obs-1', observation: makeObservation() });
      expect(toTimelineEntryDto(entry).source).toBe('observation');
    });

    it('returns "insight" when insightId is set', () => {
      const entry = makeEntry({ insightId: 'insight-1' });
      expect(toTimelineEntryDto(entry).source).toBe('insight');
    });

    it('returns "weekly_report" when weeklyReportId is set', () => {
      const entry = makeEntry({ weeklyReportId: 'report-1' });
      expect(toTimelineEntryDto(entry).source).toBe('weekly_report');
    });

    it('pull_request takes precedence when multiple FKs are non-null (defensive)', () => {
      // Should not happen in practice, but the mapper must be deterministic
      const entry = makeEntry({
        pullRequestId: 'pr-1',
        observationId: 'obs-1',
        pullRequest: makePullRequest(),
        observation: makeObservation(),
      });
      expect(toTimelineEntryDto(entry).source).toBe('pull_request');
    });
  });

  // -------------------------------------------------------------------------
  // Sub-entity: pullRequest
  // -------------------------------------------------------------------------

  describe('pullRequest mapping', () => {
    it('returns null when pullRequest is null', () => {
      const entry = makeEntry({ pullRequest: null });
      expect(toTimelineEntryDto(entry).pullRequest).toBeNull();
    });

    it('maps all pullRequest fields', () => {
      const pr = makePullRequest();
      const entry = makeEntry({ pullRequestId: 'pr-1', pullRequest: pr });
      const dto = toTimelineEntryDto(entry);

      expect(dto.pullRequest).not.toBeNull();
      expect(dto.pullRequest!.id).toBe('pr-1');
      expect(dto.pullRequest!.number).toBe(42);
      expect(dto.pullRequest!.title).toBe('Fix critical bug in auth middleware');
      expect(dto.pullRequest!.state).toBe('MERGED');
      expect(dto.pullRequest!.url).toBe('https://github.com/org/repo/pull/42');
      expect(dto.pullRequest!.repositoryFullName).toBe('org/repo');
      expect(dto.pullRequest!.additions).toBe(120);
      expect(dto.pullRequest!.deletions).toBe(45);
    });

    it('serializes pullRequest.mergedAt to ISO string', () => {
      const pr = makePullRequest();
      const entry = makeEntry({ pullRequestId: 'pr-1', pullRequest: pr });
      const dto = toTimelineEntryDto(entry);

      expect(dto.pullRequest!.mergedAt).toBe('2026-06-01T11:00:00.000Z');
    });

    it('serializes pullRequest.githubCreatedAt to ISO string', () => {
      const pr = makePullRequest();
      const entry = makeEntry({ pullRequestId: 'pr-1', pullRequest: pr });
      const dto = toTimelineEntryDto(entry);

      expect(dto.pullRequest!.githubCreatedAt).toBe('2026-05-30T09:00:00.000Z');
    });

    it('returns null for mergedAt when PR is not merged', () => {
      const pr = { ...makePullRequest(), mergedAt: null };
      const entry = makeEntry({ pullRequestId: 'pr-1', pullRequest: pr });
      const dto = toTimelineEntryDto(entry);

      expect(dto.pullRequest!.mergedAt).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Sub-entity: pullRequestReview
  // -------------------------------------------------------------------------

  describe('pullRequestReview mapping', () => {
    it('returns null when pullRequestReview is null', () => {
      const entry = makeEntry({ pullRequestReview: null });
      expect(toTimelineEntryDto(entry).pullRequestReview).toBeNull();
    });

    it('maps all pullRequestReview fields', () => {
      const review = makeReview();
      const entry = makeEntry({ pullRequestReviewId: 'review-1', pullRequestReview: review });
      const dto = toTimelineEntryDto(entry);

      expect(dto.pullRequestReview).not.toBeNull();
      expect(dto.pullRequestReview!.id).toBe('review-1');
      expect(dto.pullRequestReview!.state).toBe('APPROVED');
      expect(dto.pullRequestReview!.body).toBe('LGTM, nice clean solution');
      expect(dto.pullRequestReview!.submittedAt).toBe('2026-06-01T10:30:00.000Z');
    });

    it('maps nested pullRequest reference on review', () => {
      const review = makeReview();
      const entry = makeEntry({ pullRequestReviewId: 'review-1', pullRequestReview: review });
      const dto = toTimelineEntryDto(entry);

      expect(dto.pullRequestReview!.pullRequest).toEqual({
        number: 42,
        title: 'Fix critical bug in auth middleware',
        repositoryFullName: 'org/repo',
      });
    });

    it('returns null for pullRequest on review when not present', () => {
      const review = { ...makeReview(), pullRequest: null };
      const entry = makeEntry({ pullRequestReviewId: 'review-1', pullRequestReview: review });
      const dto = toTimelineEntryDto(entry);

      expect(dto.pullRequestReview!.pullRequest).toBeNull();
    });

    it('handles null body on review', () => {
      const review = { ...makeReview(), body: null };
      const entry = makeEntry({ pullRequestReviewId: 'review-1', pullRequestReview: review });
      const dto = toTimelineEntryDto(entry);

      expect(dto.pullRequestReview!.body).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Sub-entity: observation
  // -------------------------------------------------------------------------

  describe('observation mapping', () => {
    it('returns null when observation is null', () => {
      const entry = makeEntry({ observation: null });
      expect(toTimelineEntryDto(entry).observation).toBeNull();
    });

    it('maps all observation fields', () => {
      const obs = makeObservation();
      const entry = makeEntry({ observationId: 'obs-1', observation: obs });
      const dto = toTimelineEntryDto(entry);

      expect(dto.observation).not.toBeNull();
      expect(dto.observation!.id).toBe('obs-1');
      expect(dto.observation!.type).toBe('ACHIEVEMENT');
      expect(dto.observation!.severity).toBe('HIGH');
      expect(dto.observation!.detail).toBe('Led cross-team incident response effectively');
    });

    it('serializes observation.occurredAt to ISO string', () => {
      const obs = makeObservation();
      const entry = makeEntry({ observationId: 'obs-1', observation: obs });
      const dto = toTimelineEntryDto(entry);

      expect(dto.observation!.occurredAt).toBe('2026-06-01T08:00:00.000Z');
    });

    it('preserves null detail on observation', () => {
      const obs = { ...makeObservation(), detail: null };
      const entry = makeEntry({ observationId: 'obs-1', observation: obs });
      const dto = toTimelineEntryDto(entry);

      expect(dto.observation!.detail).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// toPaginatedTimelineResponse
// ---------------------------------------------------------------------------

describe('toPaginatedTimelineResponse', () => {
  it('maps pagination metadata faithfully', () => {
    const paginated: PaginatedTimeline = {
      data: [],
      total: 100,
      page: 3,
      limit: 25,
    };

    const result = toPaginatedTimelineResponse(paginated);

    expect(result.total).toBe(100);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(25);
  });

  it('maps all entries in the data array', () => {
    const entries = [
      makeEntry({ id: 'entry-1' }),
      makeEntry({ id: 'entry-2' }),
    ];
    const paginated: PaginatedTimeline = { data: entries as any, total: 2, page: 1, limit: 20 };

    const result = toPaginatedTimelineResponse(paginated);

    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe('entry-1');
    expect(result.data[1].id).toBe('entry-2');
  });

  it('returns empty data array without throwing', () => {
    const paginated: PaginatedTimeline = { data: [], total: 0, page: 1, limit: 20 };

    const result = toPaginatedTimelineResponse(paginated);

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('returns DTOs (not raw internal types) in data', () => {
    const entry = makeEntry({ pullRequestId: 'pr-1', pullRequest: makePullRequest() });
    const paginated: PaginatedTimeline = { data: [entry as any], total: 1, page: 1, limit: 20 };

    const result = toPaginatedTimelineResponse(paginated);
    const dto = result.data[0];

    // Source was derived
    expect(dto.source).toBe('pull_request');
    // Dates are strings
    expect(typeof dto.occurredAt).toBe('string');
    expect(typeof dto.createdAt).toBe('string');
    // PR dates are strings
    expect(typeof dto.pullRequest!.githubCreatedAt).toBe('string');
  });
});
