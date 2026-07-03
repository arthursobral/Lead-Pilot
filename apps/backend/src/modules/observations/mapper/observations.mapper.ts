import type { Observation } from '@prisma/client';
import type {
  ObservationResponseDto,
  PaginatedObservationsResponseDto,
} from '../dto/observation-response.dto';
import type { PaginatedResult } from '../types/observations.types';

/**
 * observations.mapper.ts
 *
 * Pure functions that convert internal Prisma types to API response DTOs.
 *
 * Design decisions:
 *
 *   1. Pure functions, not a class
 *      Mappers have no state and no dependencies. A static class adds noise.
 *      Pure functions are easier to test, import, and compose.
 *
 *   2. Owned by the Observations module
 *      The mapper is domain-specific: it knows the shape of the Observation
 *      Prisma model and which fields belong in the API response.
 *
 *   3. deletedAt excluded
 *      Active records always have deletedAt=null. Leaking it in the response
 *      would expose the soft-delete implementation detail to API consumers.
 *
 *   4. Dates serialized to ISO strings
 *      The API contract declares dates as strings. The mapper is responsible
 *      for this conversion so controllers and services stay clean.
 */

/**
 * Map a single Prisma Observation to the API response DTO.
 * This is the only place responsible for the Observation-to-DTO conversion.
 */
export function toObservationDto(obs: Observation): ObservationResponseDto {
  return {
    id: obs.id,
    developerId: obs.developerId,
    teamLeadId: obs.teamLeadId,
    type: obs.type as string,
    severity: obs.severity as string,
    summary: obs.summary,
    detail: obs.detail,
    occurredAt: obs.occurredAt.toISOString(),
    createdAt: obs.createdAt.toISOString(),
    updatedAt: obs.updatedAt.toISOString(),
  };
}

/**
 * Map a paginated repository result to the API response.
 */
export function toPaginatedObservationsResponse(
  paginated: PaginatedResult<Observation>,
): PaginatedObservationsResponseDto {
  return {
    data: paginated.data.map(toObservationDto),
    total: paginated.total,
    page: paginated.page,
    limit: paginated.limit,
  };
}
