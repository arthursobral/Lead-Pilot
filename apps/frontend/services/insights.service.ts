import { api } from '@/lib/api';
import type { Insight } from '@/types/insight';
import type { PaginatedResponse } from '@/types/common';

export interface GenerateInsightsDto {
  periodStart: string;
  periodEnd: string;
}

export const insightsService = {
  /**
   * Fetch all insights for a developer.
   *
   * The backend returns a paginated envelope ({ data, total, page, ... }).
   * For the MVP we load up to 100 items and unwrap .data.
   * Phase 2: replace with useInfiniteQuery + cursor-based pagination.
   */
  getByDeveloper: (developerId: string): Promise<Insight[]> =>
    api
      .get<PaginatedResponse<Insight>>(
        `/developers/${developerId}/insights?limit=100`,
      )
      .then((r) => r.data),

  generate: (developerId: string, dto: GenerateInsightsDto): Promise<Insight[]> =>
    api.post<Insight[]>(`/developers/${developerId}/insights/generate`, dto),
};
