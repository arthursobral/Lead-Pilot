/**
 * Timeline types.
 *
 * A TimelineEntry is a single chronological event in a developer's history.
 * It can be a Signal (GitHub), an Observation (human), an Achievement, or an Insight.
 */
export type TimelineEntryType =
  | 'SIGNAL'
  | 'OBSERVATION'
  | 'ACHIEVEMENT'
  | 'INSIGHT'
  | 'REPORT'
  | 'MILESTONE'
  | 'METRIC_SNAPSHOT';

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  summary: string;
  detail?: string;
  occurredAt: string;
  sourceId?: string;
}
