'use client';

import Link from 'next/link';
import { useDeveloper } from '@/hooks/useDeveloper';
import { useMetrics } from '@/hooks/useMetrics';
import { useTimeline } from '@/hooks/useTimeline';
import { useInsights } from '@/hooks/useInsights';
import { DeveloperProfileHeader } from './developer-profile-header';
import { DeveloperMetrics } from './developer-metrics';
import { ObservationList } from '@/components/observations/observation-list';
import { TimelineEntryItem } from '@/components/timeline/timeline-entry';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard, Skeleton } from '@/components/ui/skeleton';
import type { InsightType } from '@/types/insight';

interface DeveloperOverviewProps {
  developerId: string;
}

// -- Section header ----------------------------------------------------------

interface SectionHeaderProps {
  title: string;
  href?: string;
  linkLabel?: string;
  action?: React.ReactNode;
}

function SectionHeader({ title, href, linkLabel = 'View all', action }: SectionHeaderProps): React.ReactElement {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h4 className="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider">
        {title}
      </h4>
      <div className="flex items-center gap-3">
        {action}
        {href && (
          <Link
            href={href}
            className="text-xs text-stone-300 dark:text-stone-600 hover:text-stone-500 dark:hover:text-stone-400 transition-colors duration-150"
          >
            {linkLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}

// -- Compact insight row (profile preview) -----------------------------------

const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  POSITIVE_SIGNAL:      'Positive signal',
  COACHING_OPPORTUNITY: 'Coaching opportunity',
  RISK:                 'Area to watch',
  GROWTH_PATTERN:       'Growth pattern',
  RECOGNITION:          'Recognition',
  WORKLOAD_SIGNAL:      'Workload signal',
  COMMUNICATION_SIGNAL: 'Communication signal',
  LEADERSHIP_SIGNAL:    'Leadership signal',
};

const INSIGHT_TYPE_DOT: Record<InsightType, string> = {
  POSITIVE_SIGNAL:      'bg-emerald-400',
  COACHING_OPPORTUNITY: 'bg-amber-400',
  RISK:                 'bg-stone-400',
  GROWTH_PATTERN:       'bg-sky-400',
  RECOGNITION:          'bg-violet-400',
  WORKLOAD_SIGNAL:      'bg-orange-300',
  COMMUNICATION_SIGNAL: 'bg-teal-400',
  LEADERSHIP_SIGNAL:    'bg-indigo-400',
};

// -- Main component ----------------------------------------------------------

/**
 * DeveloperOverview
 *
 * The 1:1 preparation view. A single scrolling document:
 *   1. Header      -- who is this person?
 *   2. Metrics     -- what have they been doing? (GitHub activity context)
 *   3. Timeline    -- what happened recently?
 *   4. Observations -- what have I noticed? (editable inline)
 *   5. Insights    -- what does the AI see?
 *   6. Talking Points -- what should I bring up?
 *
 * Observations are rendered via ObservationList, which owns its own data
 * fetching and CRUD state. No need to call useObservations here.
 */
export function DeveloperOverview({ developerId }: DeveloperOverviewProps): React.ReactElement {
  const { developer, isLoading: devLoading } = useDeveloper(developerId);
  const { snapshot, isLoading: metricsLoading } = useMetrics(developerId);
  const { entries, isLoading: timelineLoading } = useTimeline(developerId);
  const { insights, isLoading: insightsLoading } = useInsights(developerId);

  const recentTimeline = [...entries]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 5);

  const recentInsights = [...insights]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const latestInsight = [...insights]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const talkingPoints = latestInsight?.talkingPoints.slice().sort((a, b) => a.order - b.order) ?? [];

  const placeholderDev = {
    id: developerId,
    name: 'Developer',
    role: 'Software Engineer',
    githubLogin: undefined,
    avatarUrl: undefined,
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="animate-fade-in">

      {/* 1. Header */}
      {devLoading ? (
        <div className="mb-8 flex items-start gap-4 pb-6 border-b border-stone-100 dark:border-stone-800">
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ) : (
        <DeveloperProfileHeader developer={developer ?? placeholderDev} />
      )}

      <div className="space-y-10">

        {/* 2. Metrics */}
        <section>
          <SectionHeader title="Activity context" />
          <DeveloperMetrics snapshot={snapshot} isLoading={metricsLoading} />
        </section>

        {/* 3. Timeline */}
        <section>
          <SectionHeader
            title="Recent activity"
            href={`/developers/${developerId}/timeline`}
          />
          {timelineLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : recentTimeline.length > 0 ? (
            <div>
              {recentTimeline.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <TimelineEntryItem entry={entry} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No activity yet"
              description="Connect a GitHub repository to start capturing signals and events."
              icon={
                <svg className="h-6 w-6 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          )}
        </section>

        {/* 4. Observations -- self-contained, owns fetch + CRUD */}
        <section>
          <SectionHeader
            title="Observations"
            href={`/developers/${developerId}/observations`}
            action={
              <Link
                href={`/observations/new?developerId=${developerId}`}
                className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors duration-150"
              >
                + Add
              </Link>
            }
          />
          <ObservationList developerId={developerId} limit={5} />
        </section>

        {/* 5. Insights */}
        <section>
          <SectionHeader
            title="Insights"
            href={`/developers/${developerId}/insights`}
          />
          {insightsLoading ? (
            <div className="space-y-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : recentInsights.length > 0 ? (
            <div className="space-y-2">
              {recentInsights.map((insight, idx) => (
                <div
                  key={insight.id}
                  className="animate-fade-in-up rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-4 shadow-card"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={['h-1.5 w-1.5 rounded-full flex-shrink-0', INSIGHT_TYPE_DOT[insight.type]].join(' ')} />
                    <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                      {INSIGHT_TYPE_LABELS[insight.type]}
                    </span>
                    <span className="ml-auto text-[11px] text-stone-300 dark:text-stone-600 tabular-nums">
                      {new Date(insight.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{insight.summary}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No insights yet"
              description="Generate insights from the Insights tab to get AI-suggested conversation starters."
              icon={
                <svg className="h-6 w-6 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
              }
              action={
                <Link
                  href={`/developers/${developerId}/insights`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2 text-sm text-stone-600 dark:text-stone-400 transition-all duration-150 hover:bg-stone-50 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600"
                >
                  Go to Insights
                </Link>
              }
            />
          )}
        </section>

        {/* 6. Talking Points */}
        <section>
          <SectionHeader title="Talking points for next 1:1" />
          {insightsLoading ? (
            <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-4 shadow-card space-y-2.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ) : talkingPoints.length > 0 ? (
            <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-4 shadow-card animate-fade-in-up">
              <ul className="space-y-3">
                {talkingPoints.map((tp) => (
                  <li key={tp.id} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-stone-300 flex-shrink-0" aria-hidden="true" />
                    <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">{tp.text}</p>
                  </li>
                ))}
              </ul>
              {latestInsight && (
                <p className="mt-3 pt-3 border-t border-stone-50 dark:border-stone-900 text-[11px] text-stone-300 dark:text-stone-600">
                  From insights for{' '}
                  {new Date(latestInsight.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' -- '}
                  {new Date(latestInsight.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-5 shadow-card text-center">
              <p className="text-sm text-stone-400 dark:text-stone-500">
                No talking points yet.{' '}
                <Link
                  href={`/developers/${developerId}/insights`}
                  className="text-stone-500 dark:text-stone-400 underline-offset-2 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                >
                  Generate insights
                </Link>{' '}
                to get AI-suggested conversation starters.
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
