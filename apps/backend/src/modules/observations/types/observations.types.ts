import type { ObservationSeverity, ObservationType, TimelineEntryType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Observation write interfaces
// ---------------------------------------------------------------------------

export interface CreateObservationData {
  developerId: string;
  teamLeadId: string;
  type: ObservationType;
  severity: ObservationSeverity;
  summary: string;
  detail?: string | null;
  occurredAt: Date;
}

export interface UpdateObservationData {
  summary?: string;
  detail?: string | null;
  type?: ObservationType;
  severity?: ObservationSeverity;
}

// ---------------------------------------------------------------------------
// Timeline entry created alongside each new observation
// ---------------------------------------------------------------------------

/**
 * Data needed to create a TimelineEntry alongside a new Observation.
 * The observationId is not included here -- the repository sets it inside
 * the transaction after the Observation row is inserted.
 */
export interface CreateTimelineEntryForObservation {
  developerId: string;
  type: TimelineEntryType;
  summary: string;
  occurredAt: Date;
}

// ---------------------------------------------------------------------------
// List / pagination
// ---------------------------------------------------------------------------

export interface ListObservationsOptions {
  type?: ObservationType;
  severity?: ObservationSeverity;
  /** Inclusive lower bound on occurredAt (used by Knowledge Engine for period queries) */
  from?: Date;
  /** Exclusive upper bound on occurredAt */
  to?: Date;
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
