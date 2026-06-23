import { api } from '@/lib/api';
import type { Developer, DeveloperListItem } from '@/types/developer';
import type { PaginatedResponse } from '@/types/common';

/**
 * DevelopersService
 *
 * All API calls for the developers domain.
 * Called by hooks (useDevelopers, useDeveloper) — never called from components directly.
 *
 * Methods implemented as API endpoints are built (Phase 2+).
 */
export const developersService = {
  /**
   * Returns a paginated envelope. Callers destructure `.data` for the items array.
   * Backend contract: PaginatedResponse<DeveloperResponseDto>
   */
  list: (): Promise<PaginatedResponse<DeveloperListItem>> =>
    api.get<PaginatedResponse<DeveloperListItem>>('/developers'),

  getById: (id: string): Promise<Developer> =>
    api.get<Developer>(`/developers/${id}`),
};
