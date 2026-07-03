import type { MetricSnapshot } from '@/types/metrics';
import { Skeleton } from '@/components/ui/skeleton';

interface DeveloperMetricsProps {
  snapshot: MetricSnapshot | undefined;
  isLoading: boolean;
}

/**
 * Format hours as a human-readable duration.
 * Used for avgMergeTime -- framed as context, not a benchmark.
 */
function formatHours(hours: number): string {
  if (hours < 1) return '< 1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}

/**
 * Strip the GitHub owner prefix from a repo name.
 * "org/repo-name" -> "repo-name"
 */
function repoShortName(fullName: string): string {
  const parts = fullName.split('/');
  return parts[parts.length - 1] ?? fullName;
}

interface MetricItemProps {
  label: string;
  value: string;
}

function MetricItem({ label, value }: MetricItemProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <span className="text-sm font-medium text-stone-700 dark:text-stone-300 tabular-nums truncate">
        {value}
      </span>
    </div>
  );
}

/**
 * DeveloperMetrics
 *
 * A horizontal row of GitHub activity context for the period of the most
 * recent snapshot. Framed as context -- not a scorecard.
 *
 * Shows: Pull requests merged, Reviews given, Merge time, Primary focus area.
 *
 * If no snapshot exists yet (no GitHub sync run), shows a soft placeholder
 * rather than an error state -- metrics are supplementary, not blocking.
 */
export function DeveloperMetrics({ snapshot, isLoading }: DeveloperMetricsProps): React.ReactElement {
  // -- Loading ----------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-4 shadow-card">
        <div className="flex items-center gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-2 w-16" />
              <Skeleton className="h-3.5 w-10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -- No data ----------------------------------------------------------------
  if (!snapshot) {
    return (
      <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-3.5 shadow-card animate-fade-in">
        <p className="text-xs text-stone-300 dark:text-stone-600">
          Activity data will appear here after the first GitHub sync.
        </p>
      </div>
    );
  }

  // -- Data -------------------------------------------------------------------
  const primaryFocus = snapshot.repositoryFocus[0];
  const periodLabel =
    new Date(snapshot.periodStart).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    }) +
    ' – ' +
    new Date(snapshot.periodEnd).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

  return (
    <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-4 shadow-card">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
        <MetricItem
          label="Pull requests"
          value={String(snapshot.mergedPRs)}
        />
        <MetricItem
          label="Reviews given"
          value={String(snapshot.reviewsGiven)}
        />
        {snapshot.avgMergeTime > 0 && (
          <MetricItem
            label="Merge time"
            value={formatHours(snapshot.avgMergeTime)}
          />
        )}
        {primaryFocus && (
          <MetricItem
            label="Primary focus"
            value={repoShortName(primaryFocus.repo)}
          />
        )}
      </div>
      <p className="mt-3 text-[11px] text-stone-300 dark:text-stone-600 border-t border-stone-50 dark:border-stone-900 pt-2.5 tabular-nums">
        {periodLabel}
      </p>
    </div>
  );
}
