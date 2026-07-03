'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { developersService } from '@/services/developers.service';
import type { DeveloperListItem } from '@/types/developer';
import type { PaginatedResponse } from '@/types/common';

const PAGE_LIMIT = 20;

/**
 * useDevelopers -- infinite query over the developer roster.
 *
 * Uses TanStack Query v5 useInfiniteQuery so pages are accumulated
 * correctly as the user loads more. The backend returns a standard
 * PaginatedResponse<DeveloperListItem> envelope.
 *
 * Returned shape:
 *   developers     -- flat array of all loaded items, alphabetically sorted
 *   total          -- total count from the backend (first page)
 *   isLoading      -- true on the initial fetch (no data yet)
 *   isFetchingMore -- true when a subsequent page is in flight
 *   hasNextPage    -- true if there are more pages to load
 *   fetchNextPage  -- call to append the next page
 *   error          -- ApiError or null
 *   refetch        -- retry the whole query from page 1
 */
export function useDevelopers(): {
  developers: DeveloperListItem[];
  total: number;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
  refetch: () => void;
} {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useInfiniteQuery<PaginatedResponse<DeveloperListItem>>({
    queryKey: ['developers'],
    queryFn: ({ pageParam }) =>
      developersService.list({ page: pageParam as number, limit: PAGE_LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });

  // Flatten pages and sort alphabetically.
  // Sort is stable across page loads: names are consistent from the server.
  const flat = data?.pages.flatMap((p) => p.data) ?? [];
  const developers = [...flat].sort((a, b) => a.name.localeCompare(b.name));

  // Total comes from any page -- the first page's total is authoritative.
  const total = data?.pages[0]?.total ?? 0;

  return {
    developers,
    total,
    isLoading,
    isFetchingMore: isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage: () => { void fetchNextPage(); },
    error: error as Error | null,
    refetch: () => { void refetch(); },
  };
}
