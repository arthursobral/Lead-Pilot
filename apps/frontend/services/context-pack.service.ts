import { api } from '@/lib/api';

/**
 * Context Pack service.
 *
 * The Context Pack is the structured representation of a developer's activity
 * for a given period — it is what the AI receives as input before generating
 * insights. This service is used exclusively by developer tooling (debug view).
 *
 * Endpoint: GET /developers/:developerId/knowledge/context
 */
export const contextPackService = {
  get: (
    developerId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<unknown> =>
    api.get<unknown>(
      `/developers/${developerId}/knowledge/context` +
        `?periodStart=${encodeURIComponent(periodStart)}` +
        `&periodEnd=${encodeURIComponent(periodEnd)}`,
    ),
};
