import type { Metadata } from 'next';
import { DeveloperTimelineView } from '@/components/developer/developer-timeline';

interface TimelinePageProps {
  params: { id: string };
}

export const metadata: Metadata = {
  title: 'Timeline',
};

export default function DeveloperTimelinePage({ params }: TimelinePageProps): React.ReactElement {
  return <DeveloperTimelineView developerId={params.id} />;
}
