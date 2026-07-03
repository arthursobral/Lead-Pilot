import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = {
  title: 'Observations',
};

/**
 * Observations -- /observations
 *
 * The entry point for recording qualitative notes about developers.
 * Observations feed into the AI context pack and inform coaching insights.
 *
 * Adding an observation: /observations/new
 * Reviewing a developer's observations: /developers/[id] → Overview tab
 *
 * Phase 2: add a paginated cross-team observation feed here once
 * the backend exposes a team-level observations endpoint.
 */
export default function ObservationsPage(): React.ReactElement {
  return (
    <div>
      <PageHeader
        title="Observations"
        description="Qualitative notes that give the AI context for generating better coaching insights."
        action={
          <Link
            href="/observations/new"
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 dark:bg-stone-700 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-stone-700 dark:hover:bg-stone-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add observation
          </Link>
        }
      />

      <div className="space-y-4">
        {/* What observations are */}
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-5 shadow-card">
          <h2 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">What is an observation?</h2>
          <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            An observation is a qualitative note you record about a developer — an achievement,
            a coaching moment, a customer compliment, or anything that adds context beyond
            what GitHub activity captures.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            Observations are private to you and feed directly into the AI context pack,
            making generated insights more grounded and relevant.
          </p>
        </div>

        {/* How to use them */}
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-5 shadow-card">
          <h2 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">How to use observations</h2>
          <ul className="space-y-3">
            {[
              {
                step: '1',
                text: 'Record an observation after a 1:1, incident, or notable moment.',
              },
              {
                step: '2',
                text: 'Before generating insights, run a period that covers your recent observations.',
              },
              {
                step: '3',
                text: "Review talking points in the developer's Insights tab to prepare for your next conversation.",
              },
            ].map(({ step, text }) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-[11px] font-medium text-stone-500 dark:text-stone-400">
                  {step}
                </span>
                <span className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">{text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center gap-3">
            <Link
              href="/observations/new"
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 dark:bg-stone-700 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-stone-700 dark:hover:bg-stone-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add observation
            </Link>
            <Link
              href="/developers"
              className="text-sm text-stone-400 dark:text-stone-500 transition-colors hover:text-stone-700 dark:hover:text-stone-200"
            >
              Or select a developer to review their observations
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
