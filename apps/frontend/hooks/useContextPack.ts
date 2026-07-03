import { useQuery } from '@tanstack/react-query';
import { contextPackService } from '@/services/context-pack.service';

interface ContextPackParams {
  periodStart: string;
  periodEnd: string;
}

/**
 * useContextPack
 *
 * Fetches the Context Pack for a developer and period on demand.
 * The query is disabled until `params` is non-null — the caller controls
 * when the fetch fires (explicit user action, not auto-fetch on mount).
 *
 * The response is typed as `unknown` because this hook is used exclusively
 * by the debug panel, which only renders formatted JSON.
 *
 * Cache: 5 minutes — context pack assembly is expensive (4 DB queries).
 */
export function useContextPack(
  developerId: string,
  params: ContextPackParams | null,
) {
  return useQuery<unknown, Error>({
    queryKey: ['context-pack', developerId, params?.periodStart, params?.periodEnd],
    queryFn: () =>
      contextPackService.get(developerId, params!.periodStart, params!.periodEnd),
    enabled: params !== null && !!params.periodStart && !!params.periodEnd,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
