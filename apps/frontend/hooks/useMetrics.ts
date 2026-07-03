'use client';

import { useQuery } from '@tanstack/react-query';
import { metricsService } from '@/services/metrics.service';
import type { MetricSnapshot } from '@/types/metrics';

/**
 * useMetrics -- fetch the most recent metric snapshot for a developer.
 *
 * Returns the latest snapshot (first item in the DESC-ordered array).
 * Fails gracefully -- the metrics section is supplementary context,
 * not a blocking dependency of the profile page.
 *
 * staleTime: 5 minutes -- metrics are generated on sync, not real-time.
 */
export function useMetrics(developerId: string): {
  snapshot: MetricSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useQuery({
    queryKey: ['metrics', developerId],
    queryFn: () => metricsService.getByDeveloper(developerId),
    enabled: Boolean(developerId),
    staleTime: 5 * 60 * 1000,
  });

  return {
    // Backend returns newest first; take the most recent snapshot.
    snapshot: data?.[0],
    isLoading,
    error: error as Error | null,
  };
}
