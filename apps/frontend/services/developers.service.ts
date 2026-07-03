import { api } from '@/lib/api';
import type { Developer, DeveloperListItem } from '@/types/developer';
import type { PaginatedResponse } from '@/types/common';

export interface ListDevelopersParams {
  page?: number;
  limit?: number;
}

/**
 * DevelopersService
 *
 * All API calls for the developers domain.
 * Called by hooks (useDevelopers, useDeveloper) -- never from components directly.
 */
export const developersService = {
  /**
   * Returns a paginated envelope.
   * page/limit are forwarded as query params; defaults live on the backend (page=1, limit=20).
   */
  list: (params: ListDevelopersParams = {}): Promise<PaginatedResponse<DeveloperListItem>> => {
    const qs = new URLSearchParams();
    if (params.page  !== undefined) qs.set('page',  String(params.page));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return api.get<PaginatedResponse<DeveloperListItem>>(
      query ? `/developers?${query}` : '/developers',
    );
  },

  getById: (id: string): Promise<Developer> =>
    api.get<Developer>(`/developers/${id}`),
};
