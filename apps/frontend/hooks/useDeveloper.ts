'use client';

import { useQuery } from '@tanstack/react-query';
import { developersService } from '@/services/developers.service';
import type { Developer } from '@/types/developer';

/**
 * useDeveloper — fetch a single developer by ID.
 *
 * Used on /developers/[id] and its nested tabs.
 */
export function useDeveloper(id: string): {
  developer: Developer | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useQuery({
    queryKey: ['developers', id],
    queryFn: () => developersService.getById(id),
    enabled: Boolean(id),
  });

  return {
    developer: data,
    isLoading,
    error: error as Error | null,
  };
}
