'use client';

import { TIMELINE_TYPE_LABELS } from '@/components/ui/badge';
import type { TimelineEntry } from '@/types/timeline';

interface TimelineEntryProps {
  entry: TimelineEntry;
  isLast?: boolean;
  delay?: number;
}

/**
 * Dot colour keyed by entry type.
 * Used for both the connector dot (left column) and the card-internal label dot.
 */
const DOT_COLORS: Record<string, string> = {
  SIGNAL:          'bg-stone-300',
  OBSERVATION:     'bg-amber-400',
  INSIGHT:         'bg-indigo-400',
  METRIC_SNAPSHOT: 'bg-teal-300',
  ACHIEVEMENT:     'bg-amber-400',
  MILESTONE:       'bg-emerald-400',
  REPORT:          'bg-stone-300',
};

function formatEntryDate(dateStr: string): string {
  const d   = new Date(dateStr);
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-US', opts);
}

/**
 * TimelineEntryItem
 *
 * A single chronological card in a developer's timeline.
 * Left column: coloured connector dot + vertical line (removed on isLast).
 * Right column: white card (rounded-2xl, shadow-card) with type label, date, summary.
 *
 * Stagger delay is passed by TimelineList so cards animate in sequence.
 */
export function TimelineEntryItem({
  entry,
  isLast = false,
  delay  = 0,
}: TimelineEntryProps): React.ReactElement {
  const label    = TIMELINE_TYPE_LABELS[entry.type] ?? entry.type;
  const dotColor = DOT_COLORS[entry.type] ?? 'bg-stone-300';

  return (
    <div
      className="relative flex gap-3 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* ── Connector column ─────────────────────────────────── */}
      <div className="flex flex-col items-center flex-shrink-0 w-4 pt-[18px]">
        <div className={`h-2 w-2 rounded-full flex-shrink-0 ring-2 ring-stone-50 dark:ring-stone-900 ${dotColor}`} />
        {!isLast && (
          <div className="mt-1.5 w-px flex-1 min-h-[24px] bg-stone-100 dark:bg-stone-800" />
        )}
      </div>

      {/* ── Card ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 pb-3">
        <div className="group rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
          {/* Header: type indicator + date */}
          <div className="flex items-center gap-2 mb-2.5">
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
            <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500 flex-1 min-w-0 truncate">
              {label}
            </span>
            <time className="text-xs text-stone-300 dark:text-stone-600 tabular-nums flex-shrink-0">
              {formatEntryDate(entry.occurredAt)}
            </time>
          </div>

          {/* Summary */}
          <p className="text-sm leading-relaxed text-stone-800 dark:text-stone-200">{entry.summary}</p>

          {/* Detail (optional) */}
          {entry.detail && (
            <p className="mt-1.5 text-xs leading-relaxed text-stone-400 dark:text-stone-500">{entry.detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}
