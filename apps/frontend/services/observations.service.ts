import { api } from '@/lib/api';
import type { Observation, CreateObservationDto } from '@/types/observation';

export const observationsService = {
  getByDeveloper: (developerId: string): Promise<Observation[]> =>
    api.get<Observation[]>(`/developers/${developerId}/observations`),

  create: (dto: CreateObservationDto): Promise<Observation> =>
    api.post<Observation>('/observations', dto),

  delete: (id: string): Promise<void> =>
    api.delete<void>(`/observations/${id}`),
};
