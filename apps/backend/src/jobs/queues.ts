/**
 * Queue name constants.
 *
 * Defined once here and imported by both queue producers (services)
 * and queue consumers (job processors). This prevents typos from
 * causing silent mismatches where a job is enqueued to a name
 * that no processor is listening on.
 */
export const QUEUES = {
  GITHUB_SYNC: 'github-sync',
  METRICS_CALCULATION: 'metrics-calculation',
  METRICS_SNAPSHOT: 'metrics-snapshot',
  TEAM_METRICS_AGGREGATION: 'team-metrics-aggregation',
  AI_INSIGHTS: 'ai-insights',
  WEEKLY_REPORT: 'weekly-report',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
