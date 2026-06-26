/**
 * Internal types for the Team Metrics Engine.
 *
 * TeamMetricSnapshot is defined here as an application-level interface
 * rather than sourced from the Prisma-generated client. The generated
 * client cannot be regenerated in this environment (no Linux Prisma engine),
 * so we declare the shape manually. The repository casts Prisma results
 * to this type. If prisma generate is run in a future CI step, this
 * interface should be replaced with `import type { TeamMetricSnapshot } from '@prisma/client'`.
 */

// ---------------------------------------------------------------------------
// Stored model
// ---------------------------------------------------------------------------

export interface TeamMetricSnapshot {
  id: string;
  teamLeadId: string;
  periodStart: Date;
  periodEnd: Date;

  developerCount: number;

  totalPrsOpened: number;
  totalPrsMerged: number;
  totalPrsClosed: number;
  averageMergeTimeHours: number | null;

  totalReviewsGiven: number;
  totalReviewsReceived: number;

  activeRepositories: string[];
  repoFocus: Record<string, number>;

  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Per-developer input to the aggregation
// ---------------------------------------------------------------------------

/**
 * The subset of MetricSnapshot fields consumed by aggregate().
 *
 * Declaring an explicit input interface instead of importing the full Prisma
 * MetricSnapshot type makes aggregate() easier to test and decouples the
 * team metrics engine from the individual metrics schema.
 */
export interface DeveloperSnapshotInput {
  developerId: string;
  pullRequestsOpened: number;
  pullRequestsMerged: number;
  pullRequestsClosed: number;
  averageMergeTimeHours: number | null;
  reviewsGiven: number;
  reviewsReceived: number;
  activeRepositories: string[];
  /** Stored as Prisma.JsonValue -- cast to Record<string, number> in the repository. */
  repoFocus: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Aggregation output
// ---------------------------------------------------------------------------

/**
 * All computed team-level metric values before the DB write.
 *
 * averageMergeTimeHours:
 *   Weighted average across developers, weighted by pullRequestsMerged.
 *   Developers with averageMergeTimeHours = null (no merged PRs) are excluded
 *   from both the numerator and denominator. null when no developer had
 *   merged PRs in the period.
 *
 *   Correct formula: sum(mergedCount * avgTime) / sum(mergedCount)
 *   Simple average of averages would be misleading when developer PR counts
 *   vary significantly.
 *
 * repoFocus:
 *   Sum of each developer's per-repository merged PR counts, sorted descending.
 *   Represents where the team collectively lands code, not just where they open PRs.
 */
export interface TeamComputedMetrics {
  developerCount: number;
  totalPrsOpened: number;
  totalPrsMerged: number;
  totalPrsClosed: number;
  averageMergeTimeHours: number | null;
  totalReviewsGiven: number;
  totalReviewsReceived: number;
  activeRepositories: string[];
  repoFocus: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Repository input
// ---------------------------------------------------------------------------

export interface UpsertTeamSnapshotData {
  teamLeadId: string;
  periodStart: Date;
  periodEnd: Date;
  developerCount: number;
  totalPrsOpened: number;
  totalPrsMerged: number;
  totalPrsClosed: number;
  averageMergeTimeHours: number | null;
  totalReviewsGiven: number;
  totalReviewsReceived: number;
  activeRepositories: string[];
  repoFocus: Record<string, number>;
}
