/**
 * Observation types.
 *
 * Observations are manually registered human context.
 * They are one of the most important inputs the platform receives.
 */
export type ObservationType =
  | 'ACHIEVEMENT'
  | 'CUSTOMER_FEEDBACK'
  | 'COACHING_OPPORTUNITY'
  | 'CONCERN'
  | 'LEADERSHIP'
  | 'MENTORING'
  | 'COMMUNICATION'
  | 'INCIDENT'
  | 'OWNERSHIP'
  | 'CONTEXT';

export type ObservationSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Observation {
  id: string;
  developerId: string;
  type: ObservationType;
  severity: ObservationSeverity;
  summary: string;
  detail?: string;
  date: string;
  createdAt: string;
}

export interface CreateObservationDto {
  developerId: string;
  type: ObservationType;
  severity: ObservationSeverity;
  summary: string;
  detail?: string;
  date: string;
}
