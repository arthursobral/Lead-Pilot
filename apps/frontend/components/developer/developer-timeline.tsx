'use client';

import { useDeveloper } from '@/hooks/useDeveloper';
import { useTimeline } from '@/hooks/useTimeline';
import { DeveloperProfileHeader } from './developer-profile-header';
import { DeveloperTabs } from './developer-tabs';
import { TimelineList } from '@/components/timeline/timeline-list';
import { Skeleton } from '@/components/ui/skeleton';

interface DeveloperTimelineProps {
  developerId: string;
}

/**
 * DeveloperTimelineView
 *
 * The living history of the developer -- GitHub signals, observations, and achievements
 * in chronological order.
 */
export function DeveloperTimelineView({ developerId }: DeveloperTimelineProps): React.ReactElement {
  const { developer, isLoading: devLoading } = useDeveloper(developerId);
  const { entries, isLoading: timelineLoading, error } = useTimeline(developerId);

  const placeholderDeveloper = {
    id: developerId,
    name: 'Developer',
    role: 'Software Engineer',
    githubLogin: undefined,
    avatarUrl: undefined,
    createdAt: new Date().toISOString(),
  };

  return (
    <div>
      {devLoading ? (
        <div className="mb-8 flex items-start gap-5 border-b border-stone-200 dark:border-stone-700 pb-6">
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ) : (
        <DeveloperProfileHeader developer={developer ?? placeholderDeveloper} />
      )}

      <DeveloperTabs developerId={developerId} />

      <TimelineList entries={entries} isLoading={timelineLoading} error={error} />
    </div>
  );
}
