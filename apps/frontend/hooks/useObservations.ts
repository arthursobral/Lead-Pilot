'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { observationsService } from '@/services/observations.service';
import type { CreateObservationDto, UpdateObservationDto, Observation } from '@/types/observation';

/**
 * useObservations
 *
 * Fetch, create, update, and delete observations for a developer.
 *
 * On any mutation success the observations and timeline query caches are
 * invalidated so the UI reflects changes without a manual refresh.
 * TanStack Query deduplicates requests -- calling this hook from multiple
 * components with the same developerId shares one in-flight request.
 */
export function useObservations(developerId: string): {
  observations: Observation[];
  isLoading: boolean;
  error: Error | null;
  createObservation: (dto: CreateObservationDto) => Promise<void>;
  isCreating: boolean;
  updateObservation: (id: string, dto: UpdateObservationDto) => Promise<void>;
  isUpdating: boolean;
  deleteObservation: (id: string) => Promise<void>;
  isDeleting: boolean;
} {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['observations', developerId] });
    void queryClient.invalidateQueries({ queryKey: ['timeline', developerId] });
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['observations', developerId],
    queryFn: () => observationsService.getByDeveloper(developerId),
    enabled: Boolean(developerId),
    staleTime: 0, // Observations are user-written; always refetch on mount
  });

  const { mutateAsync: createAsync, isPending: isCreating } = useMutation({
    mutationFn: (dto: CreateObservationDto) => observationsService.create(developerId, dto),
    onSuccess: invalidate,
  });

  const { mutateAsync: updateAsync, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateObservationDto }) =>
      observationsService.update(developerId, id, dto),
    onSuccess: invalidate,
  });

  const { mutateAsync: deleteAsync, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => observationsService.delete(developerId, id),
    onSuccess: invalidate,
  });

  return {
    observations: data ?? [],
    isLoading,
    error: error as Error | null,
    createObservation: async (dto) => { await createAsync(dto); },
    isCreating,
    updateObservation: async (id, dto) => { await updateAsync({ id, dto }); },
    isUpdating,
    deleteObservation: async (id) => { await deleteAsync(id); },
    isDeleting,
  };
}
