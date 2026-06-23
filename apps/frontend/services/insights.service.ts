import { api } from '@/lib/api';
import type { Insight } from '@/types/insight';

export const insightsService = {
  getByDeveloper: (developerId: string): Promise<Insight[]> =>
    api.get<Insight[]>(`/developers/${developerId}/insights`),
};
