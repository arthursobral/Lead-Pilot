/**
 * Insight types.
 *
 * Insights are AI-generated interpretations grounded in evidence.
 * They are hypotheses, not conclusions. Language in summaries is always hedged.
 */
export type InsightType =
  | 'POSITIVE_SIGNAL'
  | 'COACHING_OPPORTUNITY'
  | 'RISK'
  | 'GROWTH_PATTERN'
  | 'RECOGNITION'
  | 'WORKLOAD_SIGNAL'
  | 'COMMUNICATION_SIGNAL'
  | 'LEADERSHIP_SIGNAL';

export interface TalkingPoint {
  id: string;
  text: string;
  order: number;
}

export interface Insight {
  id: string;
  developerId: string;
  type: InsightType;
  summary: string;
  model: string | null;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  talkingPoints: TalkingPoint[];
}
