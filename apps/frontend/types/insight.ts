/**
 * Insight types.
 *
 * Insights are AI-generated interpretations grounded in evidence.
 * They are hypotheses, not conclusions.
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

export interface Insight {
  id: string;
  developerId: string;
  type: InsightType;
  summary: string;
  evidence: string[];
  createdAt: string;
}

export interface TalkingPoint {
  id: string;
  insightId: string;
  text: string;
}
