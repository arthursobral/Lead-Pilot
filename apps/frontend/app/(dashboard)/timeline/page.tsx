import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = {
  title: 'Timeline',
};

/**
 * Timeline -- /timeline
 *
 * Developer timelines are contextual and scoped per person.
 * This page guides team leads to the correct developer profile.
 *
 * Phase 2: add a cross-team activity feed here once the backend
 * exposes a paginated team-level timeline endpoint.
 */
export default function TimelinePage(): React.ReactElement {
  return (
    <div>
      <PageHeader
        title="Timeline"
        description="A chronological view of each developer's activity, signals, and key moments."
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
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300">Timelines are per developer</h3>
        <p className="mt-1.5 mx-auto max-w-xs text-sm leading-relaxed text-stone-400 dark:text-stone-500">
          Select a developer to explore their timeline — GitHub signals, observations, and insights in chronological order.
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
