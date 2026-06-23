import type { Metadata } from 'next';
import { DeveloperProfileHeader } from '@/components/developer/developer-profile-header';
import { DeveloperTabs } from '@/components/developer/developer-tabs';
import { EmptyState } from '@/components/ui/empty-state';

interface TimelinePageProps {
  params: { id: string };
}

export const metadata: Metadata = {
  title: 'Timeline',
};

/**
 * Developer timeline tab — /developers/[id]/timeline
 *
 * Layout structure (populated in Phase 4):
 * ┌────────────────────────────────────────┐
 * │ DeveloperProfileHeader                 │
 * ├────────────────────────────────────────┤
 * │ DeveloperTabs (Timeline active)        │
 * ├────────────────────────────────────────┤
 * │ TIMELINE TAB CONTENT:                  │
 * │                                        │
 * │  ● OBSERVATION — Customer praise       │
 * │  │              Jun 10                 │
 * │  ● SIGNAL — PR merged: fix/auth        │
 * │  │              Jun 8                  │
 * │  ● ACHIEVEMENT — Led incident          │
 * │  │              Jun 3                  │
 * │  ...                                   │
 * └────────────────────────────────────────┘
 *
 * Chronological — newest first.
 * Signals and observations appear together.
 * This is the living history of the developer.
 */
export default function DeveloperTimelinePage({ params }: TimelinePageProps): React.ReactElement {
  const placeholderDeveloper = {
    id: params.id,
    name: 'Developer',
    role: 'Software Engineer',
    githubLogin: undefined,
    avatarUrl: undefined,
  };

  return (
    <div>
      <DeveloperProfileHeader developer={placeholderDeveloper} />
      <DeveloperTabs developerId={params.id} />

      {/* Timeline entries — populated in Phase 4 */}
      <EmptyState
        title="Timeline is empty"
        description="The timeline will grow as GitHub signals are collected and observations are recorded."
      />
    </div>
  );
}
