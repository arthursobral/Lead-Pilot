'use client';

import type { Insight, InsightType } from '@/types/insight';

interface InsightCardProps {
  insight: Insight;
}

const typeLabels: Record<InsightType, string> = {
  POSITIVE_SIGNAL:      'Positive signal',
  COACHING_OPPORTUNITY: 'Coaching opportunity',
  RISK:                 'Area to watch',
  GROWTH_PATTERN:       'Growth pattern',
  RECOGNITION:          'Recognition',
  WORKLOAD_SIGNAL:      'Workload signal',
  COMMUNICATION_SIGNAL: 'Communication signal',
  LEADERSHIP_SIGNAL:    'Leadership signal',
};

const typeDotColor: Record<InsightType, string> = {
  POSITIVE_SIGNAL:      'bg-emerald-400',
  COACHING_OPPORTUNITY: 'bg-amber-400',
  RISK:                 'bg-stone-400',
  GROWTH_PATTERN:       'bg-sky-400',
  RECOGNITION:          'bg-violet-400',
  WORKLOAD_SIGNAL:      'bg-orange-300',
  COMMUNICATION_SIGNAL: 'bg-teal-400',
  LEADERSHIP_SIGNAL:    'bg-indigo-400',
};

/**
 * Formats a period as "Jun 1 – Jun 30, 2026".
 */
function formatPeriod(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const startStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr   = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr}\u2013${endStr}`;
}

/**
 * InsightCard
 *
 * Displays a single AI-generated insight with its talking points and evidence basis.
 *
 * Evidence basis: shows the period from which the insight was generated, framed
 * as "Based on observations and activity from [period]" rather than a bare date
 * range -- giving the reader the context they need to evaluate the suggestion.
 *
 * No scores, no confidence percentages. Talking points are conversation starters,
 * not action items.
 */
export function InsightCard({ insight }: InsightCardProps): React.ReactElement {
  const sortedPoints = [...insight.talkingPoints].sort((a, b) => a.order - b.order);

  return (
    <div className="group rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 animate-fade-in-up">
      {/* Type label */}
      <div className="flex items-center gap-2 mb-3">
        <span className={['h-1.5 w-1.5 rounded-full flex-shrink-0', typeDotColor[insight.type]].join(' ')} />
        <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider">
          {typeLabels[insight.type]}
        </span>
      </div>

      {/* Summary — the insight itself */}
      <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
        {insight.summary}
      </p>

      {/* Talking points — conversation starters, not action items */}
      {sortedPoints.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-stone-50 dark:border-stone-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-300 dark:text-stone-600 mb-2.5">
            Conversation starters
          </p>
          <ul className="space-y-2.5">
            {sortedPoints.map((tp) => (
              <li key={tp.id} className="flex items-start gap-2.5">
                <span className="mt-[7px] h-1 w-1 rounded-full bg-stone-200 dark:bg-stone-700 flex-shrink-0" />
                <span className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">{tp.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evidence basis — grounds the suggestion in real data */}
      <div className="mt-4 pt-3 border-t border-stone-50 dark:border-stone-900">
        <p className="text-[11px] text-stone-400 dark:text-stone-500 leading-relaxed">
          {'Based on observations and activity from '}
          {formatPeriod(insight.periodStart, insight.periodEnd)}
          {'.'}
        </p>
        {insight.model && (
          <p className="mt-0.5 text-[11px] text-stone-300 dark:text-stone-600 font-mono">
            {insight.model}
          </p>
        )}
      </div>
    </div>
  );
}
