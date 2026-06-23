'use client';

import { useQuery } from '@tanstack/react-query';
import { insightsService } from '@/services/insights.service';
import type { Insight } from '@/types/insight';

/**
 * useInsights — fetch AI insights for a developer.
 *
 * Used on /developers/[id]/insights.
 * Implemented when the GET /developers/:id/insights endpoint exists (Phase 5).
 */
export function useInsights(developerId: string): {
  insights: Insight[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useQuery({
    queryKey: ['insights', developerId],
    queryFn: () => insightsService.getByDeveloper(developerId),
    enabled: Boolean(developerId),
  });

  return {
    insights: data ?? [],
    isLoading,
    error: error as Error | null,
  };
}
