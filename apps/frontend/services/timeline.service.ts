import { api } from '@/lib/api';
import type { TimelineEntry } from '@/types/timeline';

export const timelineService = {
  getByDeveloper: (developerId: string): Promise<TimelineEntry[]> =>
    api.get<TimelineEntry[]>(`/developers/${developerId}/timeline`),
};
