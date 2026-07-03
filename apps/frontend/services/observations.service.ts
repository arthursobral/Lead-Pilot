import { api } from '@/lib/api';
import type { Observation, CreateObservationDto, UpdateObservationDto } from '@/types/observation';
import type { PaginatedResponse } from '@/types/common';

export const observationsService = {
  /**
   * Fetch all observations for a developer.
   *
   * The backend returns a paginated envelope ({ data, total, page, ... }).
   * For the MVP we load up to 100 items and unwrap .data.
   * Phase 2: replace with useInfiniteQuery + cursor-based pagination.
   */
  getByDeveloper: (developerId: string): Promise<Observation[]> =>
    api
      .get<PaginatedResponse<Observation>>(
        `/developers/${developerId}/observations?limit=100`,
      )
      .then((r) => r.data),

  /**
   * Create an observation for a developer.
   * developerId is sent in the URL only -- never in the request body.
   */
  create: (developerId: string, dto: CreateObservationDto): Promise<Observation> =>
    api.post<Observation>(`/developers/${developerId}/observations`, dto),

  update: (developerId: string, id: string, dto: UpdateObservationDto): Promise<Observation> =>
    api.patch<Observation>(`/developers/${developerId}/observations/${id}`, dto),

  delete: (developerId: string, id: string): Promise<void> =>
    api.delete<void>(`/developers/${developerId}/observations/${id}`),
};
