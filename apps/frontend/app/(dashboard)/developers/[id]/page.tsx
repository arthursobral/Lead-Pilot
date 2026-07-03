import type { Metadata } from 'next';
import { DeveloperOverview } from '@/components/developer/developer-overview';

interface DeveloperPageProps {
  params: { id: string };
}

export const metadata: Metadata = {
  title: 'Developer',
};

/**
 * Developer profile overview -- /developers/[id]
 *
 * The 1:1 preparation view.
 * Content is fetched client-side via DeveloperOverview (hooks cannot run in Server Components).
 */
export default function DeveloperOverviewPage({ params }: DeveloperPageProps): React.ReactElement {
  return <DeveloperOverview developerId={params.id} />;
}
