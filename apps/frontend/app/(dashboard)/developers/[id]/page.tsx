import type { Metadata } from 'next';
import { DeveloperProfileHeader } from '@/components/developer/developer-profile-header';
import { DeveloperTabs } from '@/components/developer/developer-tabs';
import { EmptyState } from '@/components/ui/empty-state';

interface DeveloperPageProps {
  params: { id: string };
}

export const metadata: Metadata = {
  title: 'Developer',
};

/**
 * Developer profile — overview tab — /developers/[id]
 *
 * Layout structure (populated in Phase 6):
 * ┌────────────────────────────────────────┐
 * │ DeveloperProfileHeader                 │
 * │  avatar | name | role | GitHub link    │
 * ├────────────────────────────────────────┤
 * │ DeveloperTabs: Overview | Timeline | Insights │
 * ├────────────────────────────────────────┤
 * │ OVERVIEW TAB CONTENT:                  │
 * │                                        │
 * │ Recent observations                    │
 * │ Talking points for next 1:1            │
 * │ Recent achievements                    │
 * └────────────────────────────────────────┘
 *
 * The overview tab is the 1:1 preparation view.
 * It answers: "What should I discuss in the next conversation?"
 */
export default function DeveloperOverviewPage({ params }: DeveloperPageProps): React.ReactElement {
  // Developer data fetched via useDeveloper hook in Phase 6.
  // Rendered as a server component here; hook usage moves to a client wrapper.
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

      {/* Overview content — populated in Phase 6 */}
      <div className="space-y-8">
        {/* Talking points section */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-stone-700">
            Talking points for next 1:1
          </h2>
          <EmptyState
            title="No talking points yet"
            description="Insights will suggest conversation topics once enough context has been gathered."
          />
        </section>

        {/* Recent observations section */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-stone-700">
              Recent observations
            </h2>
            <a
              href={`/observations/new?developerId=${params.id}`}
              className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
            >
              + Add observation
            </a>
          </div>
          <EmptyState
            title="No observations yet"
            description="Record meaningful moments — customer praise, leadership, mentoring — to build context over time."
          />
        </section>
      </div>
    </div>
  );
}
