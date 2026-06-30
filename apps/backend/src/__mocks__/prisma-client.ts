/**
 * Minimal @prisma/client stub for Jest.
 *
 * The real @prisma/client loads a platform-specific native binary
 * (.dll.node on Windows, .so.node on Linux). When prisma generate is run
 * on Windows and tests run in Linux (or vice versa), the binary causes a
 * SyntaxError and the entire test suite fails.
 *
 * This stub provides just enough surface area for tests to compile and run:
 *   - PrismaClient as an extensible class (PrismaService extends it)
 *   - No native binary, no platform-specific code
 *
 * All repositories and PrismaService are mocked in unit tests anyway,
 * so no real Prisma functionality is needed at test time.
 *
 * Keep in sync with schema.prisma when new enums are added.
 */

export class PrismaClient {
  $connect = jest.fn().mockResolvedValue(undefined);
  $disconnect = jest.fn().mockResolvedValue(undefined);
  $transaction = jest.fn();
  $on = jest.fn();
  $use = jest.fn();
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const PullRequestState = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  MERGED: 'MERGED',
} as const;

export const ReviewState = {
  APPROVED: 'APPROVED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  COMMENTED: 'COMMENTED',
  DISMISSED: 'DISMISSED',
} as const;

export const ObservationType = {
  ACHIEVEMENT: 'ACHIEVEMENT',
  CUSTOMER_FEEDBACK: 'CUSTOMER_FEEDBACK',
  COACHING_OPPORTUNITY: 'COACHING_OPPORTUNITY',
  CONCERN: 'CONCERN',
  LEADERSHIP: 'LEADERSHIP',
  MENTORING: 'MENTORING',
  COMMUNICATION: 'COMMUNICATION',
  INCIDENT: 'INCIDENT',
  OWNERSHIP: 'OWNERSHIP',
  CONTEXT: 'CONTEXT',
} as const;

export const ObservationSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export const TimelineEntryType = {
  SIGNAL: 'SIGNAL',
  OBSERVATION: 'OBSERVATION',
  ACHIEVEMENT: 'ACHIEVEMENT',
  INSIGHT: 'INSIGHT',
  REPORT: 'REPORT',
  MILESTONE: 'MILESTONE',
} as const;

export const InsightType = {
  POSITIVE_SIGNAL: 'POSITIVE_SIGNAL',
  COACHING_OPPORTUNITY: 'COACHING_OPPORTUNITY',
  RISK: 'RISK',
  GROWTH_PATTERN: 'GROWTH_PATTERN',
  RECOGNITION: 'RECOGNITION',
  WORKLOAD_SIGNAL: 'WORKLOAD_SIGNAL',
  COMMUNICATION_SIGNAL: 'COMMUNICATION_SIGNAL',
  LEADERSHIP_SIGNAL: 'LEADERSHIP_SIGNAL',
} as const;

// Legacy name -- superseded by FactConfidence below.
export const ConfidenceLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export const FactConfidence = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

// Added by Day 5 migration (add_fact_type_and_dedup_key).
export const FactType = {
  ACTIVITY_SIGNAL: 'ACTIVITY_SIGNAL',
  COLLABORATION_SIGNAL: 'COLLABORATION_SIGNAL',
  METRIC_PATTERN: 'METRIC_PATTERN',
  OBSERVATION_FACT: 'OBSERVATION_FACT',
  ACHIEVEMENT: 'ACHIEVEMENT',
  COACHING_SIGNAL: 'COACHING_SIGNAL',
} as const;

export const Prisma = {
  JsonNull: 'JsonNull',
};
