'use client';

import type { TimelineEntry } from '@/types/timeline';
import { TimelineEntryItem } from './timeline-entry';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

interface TimelineListProps {
  entries: TimelineEntry[];
  isLoading: boolean;
  error: Error | null;
}

type EntryGroup = { label: string; items: TimelineEntry[] };

function groupByMonth(entries: TimelineEntry[]): EntryGroup[] {
  // Sort newest first
  const sorted = [...entries].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  const groupMap = new Map<string, TimelineEntry[]>();
  for (const entry of sorted) {
    const key = new Date(entry.occurredAt).toLocaleDateString('en-US', {
      month: 'long',
      year:  'numeric',
    });
    const existing = groupMap.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      groupMap.set(key, [entry]);
    }
  }

  return Array.from(groupMap.entries()).map(([label, items]) => ({ label, items }));
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TimelineSkeleton(): React.ReactElement {
  return (
    <div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-3">
          {/* Connector column */}
          <div className="flex flex-col items-center flex-shrink-0 w-4 pt-[18px]">
            <Skeleton className="h-2 w-2 rounded-full" />
            {i < 4 && <Skeleton className="mt-1.5 w-px flex-1 min-h-[68px]" />}
          </div>
          {/* Card skeleton */}
          <div className="flex-1 pb-3">
            <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-4 shadow-card">
              <div className="flex items-center gap-2 mb-2.5">
                <Skeleton className="h-1.5 w-1.5 rounded-full" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-12 ml-auto" />
              </div>
              <Skeleton className="h-3 w-full mb-1.5" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state -- inline panel, not EmptyState (semantic: fetch failure != no data)
// ---------------------------------------------------------------------------

function TimelineError(): React.ReactElement {
  return (
    <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-6 shadow-card text-center animate-fade-in">
      <svg
        className="mx-auto mb-3 h-5 w-5 text-stone-300 dark:text-stone-600"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>
      <p className="text-sm text-stone-500 dark:text-stone-400">Could not load timeline.</p>
      <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
        Check that the backend is running and try again.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TimelineList
// ---------------------------------------------------------------------------

/**
 * TimelineList
 *
 * Renders developer timeline entries grouped by calendar month, newest first.
 * Each group has a subtle month header with a hairline separator.
 * Cards animate in with staggered fade-in-up, delay capped at index 8.
 */
export function TimelineList({
  entries,
  isLoading,
  error,
}: TimelineListProps): React.ReactElement {
  if (isLoading) return <TimelineSkeleton />;
  if (error)     return <TimelineError />;

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No timeline entries yet"
        description="Timeline entries are created from GitHub activity, observations, and other signals as the team lead uses the platform."
      />
    );
  }

  const groups = groupByMonth(entries);

  // Pre-compute delays from a flat index across all groups so stagger is
  // continuous (not reset per month).
  let flatIdx = 0;
  const rendered = groups.map(({ label, items }) => ({
    label,
    entries: items.map((entry, localIdx) => ({
      entry,
      isLast: localIdx === items.length - 1,
      delay:  Math.min(flatIdx++, 8) * 40,
    })),
  }));

  return (
    <div className="animate-fade-in">
      {rendered.map(({ label, entries: groupEntries }) => (
        <div key={label} className="mb-8 last:mb-0">
          {/* Month header */}
          <div className="mb-4 flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500 whitespace-nowrap">
              {label}
            </span>
            <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
          </div>

          {/* Entries */}
          <div>
            {groupEntries.map(({ entry, isLast, delay }) => (
              <TimelineEntryItem
                key={entry.id}
                entry={entry}
                isLast={isLast}
                delay={delay}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
