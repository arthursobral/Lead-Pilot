import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * Team overview page — /
 *
 * The home page for a Team Lead. Shows the team at a glance.
 *
 * Layout structure (populated in Phase 6):
 * ┌────────────────────────────────────────┐
 * │ PageHeader: "Your Team"                │
 * ├────────────────────────────────────────┤
 * │ Developer cards (DeveloperCard list)   │
 * └────────────────────────────────────────┘
 *
 * No metrics on this page. The question answered here is:
 * "Who is on my team?" — not "How is my team performing?"
 */
export default function TeamPage(): React.ReactElement {
  return (
    <div>
      <PageHeader
        title="Your Team"
        description="Select a developer to review their context and prepare for your next conversation."
        action={
          <a
            href="/settings"
            className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Connect GitHub
          </a>
        }
      />

      {/* Developer list — populated with real data in Phase 6 */}
      <div className="space-y-3">
        <EmptyState
          title="No developers yet"
          description="Connect your GitHub account to start importing your team's activity."
          action={
            <a
              href="/settings"
              className="inline-flex items-center rounded-md bg-stone-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-stone-700 transition-colors"
            >
              Connect GitHub
            </a>
          }
        />
      </div>
    </div>
  );
}
