import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { TimelineEntry } from '@/types/timeline';

interface TimelineEntryProps {
  entry: TimelineEntry;
}

/**
 * TimelineEntry
 *
 * A single event in a developer's timeline.
 *
 * Design:
 * - Vertical line with a dot — classic timeline pattern, document-like.
 * - Date appears small on the right — de-emphasised; the content is primary.
 * - No colored left borders — those read as severity indicators and
 *   would push the UI toward a monitoring/alerting aesthetic.
 */
export function TimelineEntryItem({ entry }: TimelineEntryProps): React.ReactElement {
  return (
    <div className="relative flex gap-4">
      {/* Vertical connector */}
      <div className="flex flex-col items-center">
        <div className="h-2 w-2 mt-1.5 flex-shrink-0 rounded-full bg-stone-300 ring-2 ring-stone-50" />
        <div className="mt-1 w-px flex-1 bg-stone-200" />
      </div>

      {/* Content */}
      <div className="pb-6 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="mb-1">
              <Badge label={entry.type} />
            </div>
            <p className="text-sm text-stone-900">{entry.summary}</p>
            {entry.detail && (
              <p className="mt-1 text-sm text-stone-500">{entry.detail}</p>
            )}
          </div>
          <time className="flex-shrink-0 text-xs text-stone-400 mt-0.5">
            {formatDate(entry.date)}
          </time>
        </div>
      </div>
    </div>
  );
}
