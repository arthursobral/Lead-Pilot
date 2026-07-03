/**
 * ObservationResponseDto
 *
 * The clean API contract for a single Observation.
 *
 * Design decisions:
 *   - Dates are ISO 8601 strings (not Date objects) -- the API layer
 *     serializes, never leaks raw JS Date instances.
 *   - deletedAt is intentionally excluded: it is an internal implementation
 *     detail of the soft-delete pattern and has no meaning for active records.
 *   - teamLeadId is included so the UI can show who authored the observation.
 *   - type and severity are returned as plain strings -- the enum values are
 *     human-readable and the UI uses them for display and filtering.
 */
export class ObservationResponseDto {
  id: string;
  developerId: string;
  teamLeadId: string;
  type: string;
  severity: string;
  summary: string;
  detail: string | null;
  occurredAt: string;   // ISO 8601
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
}

export class PaginatedObservationsResponseDto {
  data: ObservationResponseDto[];
  total: number;
  page: number;
  limit: number;
}
