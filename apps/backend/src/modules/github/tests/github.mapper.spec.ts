import { GithubMapper } from '../github.mapper';
import type {
  GithubApiPullRequest,
  GithubApiReview,
  GithubApiUser,
} from '../github.types';

// =============================================================================
// Fixtures
// =============================================================================

const BOT_USER: GithubApiUser = {
  id: 49699333,
  login: 'dependabot[bot]',
  avatar_url: 'https://avatars.githubusercontent.com/u/49699333',
  type: 'Bot',
};

const HUMAN_USER: GithubApiUser = {
  id: 1001,
  login: 'alice',
  avatar_url: 'https://avatars.githubusercontent.com/u/1001',
  type: 'User',
};

const REVIEWER_USER: GithubApiUser = {
  id: 1002,
  login: 'bob',
  avatar_url: 'https://avatars.githubusercontent.com/u/1002',
  type: 'User',
};

/** Minimal valid open PR (as returned from the list endpoint). */
const OPEN_PR: GithubApiPullRequest = {
  id: 987654321,
  node_id: 'PR_kwDOABCDEF12345',
  number: 42,
  title: 'feat: add GitHub ingestion',
  body: 'This PR adds GitHub PR and review ingestion.',
  state: 'open',
  draft: false,
  html_url: 'https://github.com/org/repo/pull/42',
  user: HUMAN_USER,
  created_at: '2026-06-01T10:00:00Z',
  updated_at: '2026-06-10T15:30:00Z',
  merged_at: null,
  closed_at: null,
  additions: 120,
  deletions: 30,
  changed_files: 5,
  labels: [
    { id: 1, name: 'feature', color: '0075ca' },
    { id: 2, name: 'backend', color: 'e4e669' },
  ],
  base: { repo: { name: 'repo', full_name: 'org/repo' } },
};

/** Merged PR - state is 'closed' but merged_at is set. */
const MERGED_PR: GithubApiPullRequest = {
  ...OPEN_PR,
  node_id: 'PR_kwDOABCDEF99999',
  number: 10,
  title: 'fix: resolve null pointer',
  state: 'closed',
  merged_at: '2026-05-20T12:00:00Z',
  closed_at: '2026-05-20T12:00:00Z',
};

/** Closed (rejected) PR - state is 'closed', merged_at is null. */
const CLOSED_PR: GithubApiPullRequest = {
  ...OPEN_PR,
  node_id: 'PR_kwDOABCDEF00000',
  number: 5,
  title: 'wip: unfinished experiment',
  state: 'closed',
  merged_at: null,
  closed_at: '2026-04-15T09:00:00Z',
};

/** Draft PR. */
const DRAFT_PR: GithubApiPullRequest = {
  ...OPEN_PR,
  node_id: 'PR_kwDOABCDEFdraft',
  number: 99,
  title: 'draft: WIP refactor',
  draft: true,
};

/** PR with a null body. */
const NULL_BODY_PR: GithubApiPullRequest = {
  ...OPEN_PR,
  node_id: 'PR_kwDOABCDEFnobody',
  number: 7,
  title: 'chore: dependency update',
  body: null,
};

/** PR with a null/deleted author. */
const DELETED_AUTHOR_PR: GithubApiPullRequest = {
  ...OPEN_PR,
  node_id: 'PR_kwDOABCDEFghost',
  number: 11,
  user: null,
};

/** Bot-authored PR (Dependabot). */
const BOT_PR: GithubApiPullRequest = {
  ...OPEN_PR,
  node_id: 'PR_kwDOABCDEFbot',
  number: 200,
  user: BOT_USER,
};

/** PR with no labels. */
const NO_LABELS_PR: GithubApiPullRequest = {
  ...OPEN_PR,
  node_id: 'PR_kwDOABCDEFnolabels',
  number: 50,
  labels: [],
};

const APPROVED_REVIEW: GithubApiReview = {
  id: 111,
  node_id: 'PRR_kwDOABCDEFapproved',
  user: REVIEWER_USER,
  body: 'LGTM!',
  state: 'APPROVED',
  submitted_at: '2026-06-11T08:00:00Z',
  pull_request_url:
    'https://api.github.com/repos/org/repo/pulls/42',
};

const CHANGES_REQUESTED_REVIEW: GithubApiReview = {
  ...APPROVED_REVIEW,
  node_id: 'PRR_kwDOABCDEFchanges',
  body: 'Please address the comments.',
  state: 'CHANGES_REQUESTED',
  submitted_at: '2026-06-09T14:00:00Z',
};

const COMMENTED_REVIEW: GithubApiReview = {
  ...APPROVED_REVIEW,
  node_id: 'PRR_kwDOABCDEFcomment',
  body: 'Left some notes.',
  state: 'COMMENTED',
  submitted_at: '2026-06-08T11:00:00Z',
};

const DISMISSED_REVIEW: GithubApiReview = {
  ...APPROVED_REVIEW,
  node_id: 'PRR_kwDOABCDEFdismissed',
  body: null,
  state: 'DISMISSED',
  submitted_at: '2026-06-07T10:00:00Z',
};

const PENDING_REVIEW: GithubApiReview = {
  ...APPROVED_REVIEW,
  node_id: 'PRR_kwDOABCDEFpending',
  body: '',
  state: 'PENDING',
  submitted_at: '', // PENDING reviews have no submitted_at
};

const NULL_REVIEWER_REVIEW: GithubApiReview = {
  ...APPROVED_REVIEW,
  node_id: 'PRR_kwDOABCDEFghost',
  user: null,
};

const EMPTY_BODY_REVIEW: GithubApiReview = {
  ...APPROVED_REVIEW,
  node_id: 'PRR_kwDOABCDEFempty',
  body: '',
  state: 'COMMENTED',
};

const PR_NODE_ID = OPEN_PR.node_id;

// =============================================================================
// Tests
// =============================================================================

describe('GithubMapper', () => {
  let mapper: GithubMapper;

  beforeEach(() => {
    // GithubMapper has no dependencies - instantiate directly.
    mapper = new GithubMapper();
  });

  // ---------------------------------------------------------------------------
  // mapUser
  // ---------------------------------------------------------------------------

  describe('mapUser', () => {
    it('maps a human user correctly', () => {
      const result = mapper.mapUser(HUMAN_USER);

      expect(result).toEqual({
        githubId: '1001',
        githubLogin: 'alice',
        name: 'alice',
        avatarUrl: 'https://avatars.githubusercontent.com/u/1001',
        isBot: false,
      });
    });

    it('converts numeric id to string for stable identity key', () => {
      const result = mapper.mapUser(HUMAN_USER);
      expect(typeof result.githubId).toBe('string');
      expect(result.githubId).toBe('1001');
    });

    it('marks bot accounts with isBot=true', () => {
      const result = mapper.mapUser(BOT_USER);
      expect(result.isBot).toBe(true);
    });

    it('sets name to login (list endpoint has no display name)', () => {
      const result = mapper.mapUser(HUMAN_USER);
      expect(result.name).toBe(HUMAN_USER.login);
    });

    it('handles null avatar_url gracefully', () => {
      const userWithNoAvatar: GithubApiUser = {
        ...HUMAN_USER,
        avatar_url: null as unknown as string, // some responses have null
      };
      const result = mapper.mapUser(userWithNoAvatar);
      expect(result.avatarUrl).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // mapPullRequest - state mapping
  // ---------------------------------------------------------------------------

  describe('mapPullRequest — state', () => {
    it('maps state="open" to OPEN', () => {
      const result = mapper.mapPullRequest(OPEN_PR);
      expect(result.state).toBe('OPEN');
    });

    it('maps state="closed" with merged_at set to MERGED', () => {
      const result = mapper.mapPullRequest(MERGED_PR);
      expect(result.state).toBe('MERGED');
    });

    it('maps state="closed" with merged_at=null to CLOSED', () => {
      const result = mapper.mapPullRequest(CLOSED_PR);
      expect(result.state).toBe('CLOSED');
    });

    it('sets mergedAt as a Date for merged PRs', () => {
      const result = mapper.mapPullRequest(MERGED_PR);
      expect(result.mergedAt).toBeInstanceOf(Date);
      expect(result.mergedAt?.toISOString()).toBe('2026-05-20T12:00:00.000Z');
    });

    it('sets mergedAt to null for non-merged PRs', () => {
      const result = mapper.mapPullRequest(OPEN_PR);
      expect(result.mergedAt).toBeNull();
    });

    it('sets closedAt as a Date for closed PRs', () => {
      const result = mapper.mapPullRequest(CLOSED_PR);
      expect(result.closedAt).toBeInstanceOf(Date);
    });

    it('sets closedAt to null for open PRs', () => {
      const result = mapper.mapPullRequest(OPEN_PR);
      expect(result.closedAt).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // mapPullRequest - core fields
  // ---------------------------------------------------------------------------

  describe('mapPullRequest — core fields', () => {
    it('maps all required fields from an open PR', () => {
      const result = mapper.mapPullRequest(OPEN_PR);

      expect(result.githubNodeId).toBe('PR_kwDOABCDEF12345');
      expect(result.number).toBe(42);
      expect(result.title).toBe('feat: add GitHub ingestion');
      expect(result.body).toBe('This PR adds GitHub PR and review ingestion.');
      expect(result.draft).toBe(false);
      expect(result.url).toBe('https://github.com/org/repo/pull/42');
      expect(result.repositoryName).toBe('repo');
      expect(result.repositoryFullName).toBe('org/repo');
      expect(result.additions).toBe(120);
      expect(result.deletions).toBe(30);
      expect(result.changedFiles).toBe(5);
    });

    it('parses ISO 8601 timestamps as Date objects', () => {
      const result = mapper.mapPullRequest(OPEN_PR);
      expect(result.githubCreatedAt).toBeInstanceOf(Date);
      expect(result.githubUpdatedAt).toBeInstanceOf(Date);
      expect(result.githubCreatedAt.toISOString()).toBe(
        '2026-06-01T10:00:00.000Z',
      );
    });

    it('maps author to NormalizedGithubUser', () => {
      const result = mapper.mapPullRequest(OPEN_PR);
      expect(result.author).not.toBeNull();
      expect(result.author?.githubLogin).toBe('alice');
      expect(result.author?.isBot).toBe(false);
    });

    it('sets author to null when the account was deleted', () => {
      const result = mapper.mapPullRequest(DELETED_AUTHOR_PR);
      expect(result.author).toBeNull();
    });

    it('preserves null body', () => {
      const result = mapper.mapPullRequest(NULL_BODY_PR);
      expect(result.body).toBeNull();
    });

    it('marks draft PRs correctly', () => {
      const result = mapper.mapPullRequest(DRAFT_PR);
      expect(result.draft).toBe(true);
    });

    it('maps labels to name-only string array', () => {
      const result = mapper.mapPullRequest(OPEN_PR);
      expect(result.labels).toEqual(['feature', 'backend']);
    });

    it('maps empty labels array to empty array', () => {
      const result = mapper.mapPullRequest(NO_LABELS_PR);
      expect(result.labels).toEqual([]);
    });

    it('marks bot-authored PRs with isBot=true on the author', () => {
      const result = mapper.mapPullRequest(BOT_PR);
      expect(result.author?.isBot).toBe(true);
      expect(result.author?.githubLogin).toBe('dependabot[bot]');
    });
  });

  // ---------------------------------------------------------------------------
  // mapReview - filtering
  // ---------------------------------------------------------------------------

  describe('mapReview — PENDING filtering', () => {
    it('returns null for PENDING reviews', () => {
      const result = mapper.mapReview(PENDING_REVIEW, PR_NODE_ID);
      expect(result).toBeNull();
    });

    it('returns non-null for APPROVED reviews', () => {
      const result = mapper.mapReview(APPROVED_REVIEW, PR_NODE_ID);
      expect(result).not.toBeNull();
    });

    it('returns non-null for CHANGES_REQUESTED reviews', () => {
      const result = mapper.mapReview(CHANGES_REQUESTED_REVIEW, PR_NODE_ID);
      expect(result).not.toBeNull();
    });

    it('returns non-null for COMMENTED reviews', () => {
      const result = mapper.mapReview(COMMENTED_REVIEW, PR_NODE_ID);
      expect(result).not.toBeNull();
    });

    it('returns non-null for DISMISSED reviews', () => {
      const result = mapper.mapReview(DISMISSED_REVIEW, PR_NODE_ID);
      expect(result).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // mapReview - core fields
  // ---------------------------------------------------------------------------

  describe('mapReview — core fields', () => {
    it('maps all fields of an APPROVED review', () => {
      const result = mapper.mapReview(APPROVED_REVIEW, PR_NODE_ID);

      expect(result).toEqual({
        githubNodeId: 'PRR_kwDOABCDEFapproved',
        prGithubNodeId: PR_NODE_ID,
        state: 'APPROVED',
        body: 'LGTM!',
        submittedAt: new Date('2026-06-11T08:00:00Z'),
        reviewer: {
          githubId: '1002',
          githubLogin: 'bob',
          name: 'bob',
          avatarUrl: 'https://avatars.githubusercontent.com/u/1002',
          isBot: false,
        },
      });
    });

    it('maps CHANGES_REQUESTED state correctly', () => {
      const result = mapper.mapReview(CHANGES_REQUESTED_REVIEW, PR_NODE_ID);
      expect(result?.state).toBe('CHANGES_REQUESTED');
    });

    it('maps DISMISSED state correctly', () => {
      const result = mapper.mapReview(DISMISSED_REVIEW, PR_NODE_ID);
      expect(result?.state).toBe('DISMISSED');
    });

    it('parses submitted_at as a Date', () => {
      const result = mapper.mapReview(APPROVED_REVIEW, PR_NODE_ID);
      expect(result?.submittedAt).toBeInstanceOf(Date);
      expect(result?.submittedAt.toISOString()).toBe('2026-06-11T08:00:00.000Z');
    });

    it('stores the prGithubNodeId supplied by the caller', () => {
      const customNodeId = 'PR_kwDOCustom99';
      const result = mapper.mapReview(APPROVED_REVIEW, customNodeId);
      expect(result?.prGithubNodeId).toBe(customNodeId);
    });

    it('sets reviewer to null when account was deleted', () => {
      const result = mapper.mapReview(NULL_REVIEWER_REVIEW, PR_NODE_ID);
      expect(result?.reviewer).toBeNull();
    });

    it('normalises null review body to null', () => {
      const result = mapper.mapReview(DISMISSED_REVIEW, PR_NODE_ID);
      expect(result?.body).toBeNull();
    });

    it('normalises empty-string review body to null', () => {
      const result = mapper.mapReview(EMPTY_BODY_REVIEW, PR_NODE_ID);
      expect(result?.body).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // End-to-end: PR page with mixed states
  // ---------------------------------------------------------------------------

  describe('array mapping — simulate a real page', () => {
    it('correctly maps a page with open, merged, and closed PRs', () => {
      const page = [OPEN_PR, MERGED_PR, CLOSED_PR];
      const results = page.map((pr) => mapper.mapPullRequest(pr));

      expect(results[0].state).toBe('OPEN');
      expect(results[1].state).toBe('MERGED');
      expect(results[2].state).toBe('CLOSED');
    });

    it('filters PENDING reviews from a mixed review list', () => {
      const rawReviews = [
        APPROVED_REVIEW,
        PENDING_REVIEW,
        CHANGES_REQUESTED_REVIEW,
        PENDING_REVIEW,
        COMMENTED_REVIEW,
      ];

      const filtered = rawReviews
        .map((r) => mapper.mapReview(r, PR_NODE_ID))
        .filter((r): r is NonNullable<typeof r> => r !== null);

      expect(filtered).toHaveLength(3);
      expect(filtered.map((r) => r.state)).toEqual([
        'APPROVED',
        'CHANGES_REQUESTED',
        'COMMENTED',
      ]);
    });
  });
});
