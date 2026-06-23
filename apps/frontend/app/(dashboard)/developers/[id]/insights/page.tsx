import type { Metadata } from 'next';
import { DeveloperProfileHeader } from '@/components/developer/developer-profile-header';
import { DeveloperTabs } from '@/components/developer/developer-tabs';
import { EmptyState } from '@/components/ui/empty-state';

interface InsightsPageProps {
  params: { id: string };
}

export const metadata: Metadata = {
  title: 'Insights',
};

/**
 * Developer insights tab — /developers/[id]/insights
 *
 * Layout structure (populated in Phase 5):
 * ┌────────────────────────────────────────┐
 * │ DeveloperProfileHeader                 │
 * ├────────────────────────────────────────┤
 * │ DeveloperTabs (Insights active)        │
 * ├────────────────────────────────────────┤
 * │ INSIGHTS TAB CONTENT:                  │
 * │                                        │
 * │ Positive signals (InsightCard list)    │
 * │ Coaching opportunities (InsightCard)   │
 * │ Risks (InsightCard list)               │
 * └────────────────────────────────────────┘
 *
 * Insights are AI-generated hypotheses, not conclusions.
 * Language is always hedged: "may suggest", "one possible interpretation".
 * Every insight links to its supporting evidence.
 */
export default function DeveloperInsightsPage({ params }: InsightsPageProps): React.ReactElement {
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

      {/* Insight sections — populated in Phase 5 */}
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-medium text-stone-700">Positive signals</h2>
          <EmptyState
            title="No insights yet"
            description="Insights are generated once enough signals and observations have been collected."
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-stone-700">Coaching opportunities</h2>
          <EmptyState
            title="No coaching opportunities identified"
            description="The AI will suggest potential growth areas as more context becomes available."
          />
        </section>
      </div>
    </div>
  );
}
