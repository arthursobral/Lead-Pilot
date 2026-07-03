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
  occurredAt: string;
  createdAt: string;
}

/**
 * Fields sent to POST /developers/:developerId/observations.
 * developerId is in the URL -- never in the body.
 * The date field is occurredAt (ISO 8601), matching the backend DTO.
 */
export interface CreateObservationDto {
  type: ObservationType;
  severity: ObservationSeverity;
  summary: string;
  detail?: string;
  occurredAt: string;
}

/**
 * All fields optional -- PATCH semantics.
 * occurredAt is immutable on the backend and intentionally excluded.
 */
export interface UpdateObservationDto {
  type?: ObservationType;
  severity?: ObservationSeverity;
  summary?: string;
  detail?: string;
}
