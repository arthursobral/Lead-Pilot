'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { observationsService } from '@/services/observations.service';
import type { CreateObservationDto, Observation } from '@/types/observation';

/**
 * useObservations — fetch and create observations for a developer.
 *
 * On successful create, invalidates the timeline and observations queries
 * so the UI reflects the new entry without a manual refresh.
 */
export function useObservations(developerId: string): {
  observations: Observation[];
  isLoading: boolean;
  createObservation: (dto: CreateObservationDto) => Promise<void>;
  isCreating: boolean;
} {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['observations', developerId],
    queryFn: () => observationsService.getByDeveloper(developerId),
    enabled: Boolean(developerId),
  });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: observationsService.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['observations', developerId] });
      void queryClient.invalidateQueries({ queryKey: ['timeline', developerId] });
    },
  });

  return {
    observations: data ?? [],
    isLoading,
    createObservation: async (dto) => { await mutateAsync(dto); },
    isCreating: isPending,
  };
}
