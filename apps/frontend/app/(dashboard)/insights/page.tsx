import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = {
  title: 'Insights',
};

/**
 * Insights -- /insights
 *
 * AI-generated insights are scoped to individual developers.
 * This page directs team leads to select a developer to review their insights.
 *
 * Phase 2: promote a cross-team "recent insights" feed here once
 * the backend exposes a paginated team-level endpoint.
 */
export default function InsightsPage(): React.ReactElement {
  return (
    <div>
      <PageHeader
        title="Insights"
        description="AI-generated coaching insights, grounded in your team's activity."
      />

      <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-8 py-12 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-stone-50 dark:bg-stone-900 shadow-card">
          <svg
            className="h-5 w-5 text-stone-300 dark:text-stone-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.25}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300">Insights are per developer</h3>
        <p className="mt-1.5 mx-auto max-w-xs text-sm leading-relaxed text-stone-400 dark:text-stone-500">
          Select a developer from your team roster to generate and review their AI-generated insights.
        </p>
        <Link
          href="/developers"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-stone-900 dark:bg-stone-700 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-stone-700 dark:hover:bg-stone-600"
        >
          Go to developers
        </Link>
      </div>
    </div>
  );
}
