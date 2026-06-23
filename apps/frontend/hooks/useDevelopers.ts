'use client';

import { useQuery } from '@tanstack/react-query';
import { developersService } from '@/services/developers.service';
import type { DeveloperListItem } from '@/types/developer';

/**
 * useDevelopers — fetch the full developer list.
 *
 * Used on / and /developers pages.
 * Implemented when the GET /developers endpoint exists (Phase 6).
 */
export function useDevelopers(): {
  developers: DeveloperListItem[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useQuery({
    queryKey: ['developers'],
    queryFn: developersService.list,
  });

  return {
    // data is PaginatedResponse — extract the items array
    developers: data?.data ?? [],
    isLoading,
    error: error as Error | null,
  };
}
