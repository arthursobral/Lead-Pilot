import { api } from '@/lib/api';
import type { TimelineEntry } from '@/types/timeline';
import type { PaginatedResponse } from '@/types/common';

export const timelineService = {
  /**
   * Fetch all timeline entries for a developer.
   *
   * The backend returns a paginated envelope ({ data, total, page, ... }).
   * For the MVP we load up to 100 entries and unwrap .data.
   * Phase 2: replace with useInfiniteQuery + cursor-based pagination.
   */
  getByDeveloper: (developerId: string): Promise<TimelineEntry[]> =>
    api
      .get<PaginatedResponse<TimelineEntry>>(
        `/developers/${developerId}/timeline?limit=100`,
      )
      .then((r) => r.data),
};
