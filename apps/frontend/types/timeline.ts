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
  | 'MILESTONE';

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  summary: string;
  detail?: string;
  date: string;
  sourceId?: string;
}
