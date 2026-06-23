import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Developers',
};

/**
 * Developer list page — /developers
 *
 * Lists all developers the Team Lead is following.
 *
 * Layout structure (populated in Phase 6):
 * ┌────────────────────────────────────────┐
 * │ PageHeader: "Developers"               │
 * │  action: "+ Add observation"           │
 * ├────────────────────────────────────────┤
 * │ DeveloperCard                          │
 * │ DeveloperCard                          │
 * │ DeveloperCard                          │
 * │ ...                                    │
 * └────────────────────────────────────────┘
 *
 * Sorting: most recently active first (not alphabetical).
 * No ranking or comparison between developers.
 */
export default function DevelopersPage(): React.ReactElement {
  return (
    <div>
      <PageHeader
        title="Developers"
        description="Your team members. Select anyone to review their story and prepare for a conversation."
        action={
          <a
            href="/observations/new"
            className="inline-flex items-center gap-2 rounded-md bg-stone-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-stone-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add observation
          </a>
        }
      />

      {/* DeveloperCard list — populated in Phase 6 */}
      <div className="space-y-2">
        <EmptyState
          title="No developers found"
          description="Once you connect GitHub, your team will appear here."
        />
      </div>
    </div>
  );
}
