import type { Metadata } from 'next';
import { DeveloperInsights } from '@/components/developer/developer-insights';

interface InsightsPageProps {
  params: { id: string };
}

export const metadata: Metadata = {
  title: 'Insights',
};

export default function DeveloperInsightsPage({ params }: InsightsPageProps): React.ReactElement {
  return <DeveloperInsights developerId={params.id} />;
}
