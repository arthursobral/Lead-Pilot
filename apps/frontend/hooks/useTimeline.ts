'use client';

import { useQuery } from '@tanstack/react-query';
import { timelineService } from '@/services/timeline.service';
import type { TimelineEntry } from '@/types/timeline';

/**
 * useTimeline — fetch timeline entries for a developer.
 *
 * Used on /developers/[id]/timeline.
 * Implemented when the GET /developers/:id/timeline endpoint exists (Phase 4).
 */
export function useTimeline(developerId: string): {
  entries: TimelineEntry[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useQuery({
    queryKey: ['timeline', developerId],
    queryFn: () => timelineService.getByDeveloper(developerId),
    enabled: Boolean(developerId),
  });

  return {
    entries: data ?? [],
    isLoading,
    error: error as Error | null,
  };
}
