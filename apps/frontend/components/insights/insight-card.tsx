import type { Insight } from '@/types/insight';

interface InsightCardProps {
  insight: Insight;
}

/**
 * InsightCard
 *
 * Displays a single AI-generated insight.
 *
 * Design:
 * - Prose-first: the summary leads, evidence follows.
 * - No score or confidence percentage shown — only the human-readable
 *   explanation and its evidence references.
 * - Careful hedged language ("may suggest", "one possible interpretation")
 *   is a property of the data, not added by this component.
 */
export function InsightCard({ insight }: InsightCardProps): React.ReactElement {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <div className="h-1.5 w-1.5 rounded-full bg-stone-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-900 leading-relaxed">{insight.summary}</p>
          {insight.evidence && insight.evidence.length > 0 && (
            <p className="mt-2 text-xs text-stone-400">
              Based on: {insight.evidence.join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
