'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { insightsService, type GenerateInsightsDto } from '@/services/insights.service';

/**
 * useGenerateInsights -- trigger AI insight generation for a developer period.
 *
 * On success, invalidates the insights query so the list refreshes automatically.
 * Maps server errors into human-readable messages:
 *   422 + "no facts"    -> prompt to generate facts first
 *   422 + "could not be parsed" -> prompt to retry (transient LLM parse failure)
 *   other              -> generic retry message
 */
export function useGenerateInsights(developerId: string): {
  generate: (dto: GenerateInsightsDto) => Promise<void>;
  isPending: boolean;
  error: string | null;
  isSuccess: boolean;
} {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error, isSuccess, reset } = useMutation({
    mutationFn: (dto: GenerateInsightsDto) =>
      insightsService.generate(developerId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['insights', developerId] });
    },
  });

  const errorMessage = error ? resolveErrorMessage(error) : null;

  return {
    generate: async (dto) => {
      reset();
      await mutateAsync(dto);
    },
    isPending,
    error: errorMessage,
    isSuccess,
  };
}

function resolveErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.toLowerCase().includes('no facts')) {
    return 'No activity data found for this period. Generate facts first by running the data sync.';
  }
  if (message.toLowerCase().includes('could not be parsed') || message.toLowerCase().includes('invalid response')) {
    return 'The AI returned an unexpected response. Try generating again — this usually resolves on a second attempt.';
  }
  if (message.toLowerCase().includes('timeout') || message.toLowerCase().includes('aborted')) {
    return 'The AI took too long to respond. This can happen when the model is under load. Try again in a moment.';
  }
  return 'Something went wrong while generating insights. Try again.';
}
