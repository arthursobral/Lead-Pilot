'use client';

import type { Insight, InsightType } from '@/types/insight';
import { InsightCard } from './insight-card';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

interface InsightListProps {
  insights: Insight[];
  isLoading: boolean;
  error: Error | null;
}

const SECTION_ORDER: InsightType[] = [
  'POSITIVE_SIGNAL',
  'RECOGNITION',
  'GROWTH_PATTERN',
  'COACHING_OPPORTUNITY',
  'LEADERSHIP_SIGNAL',
  'COMMUNICATION_SIGNAL',
  'WORKLOAD_SIGNAL',
  'RISK',
];

const sectionTitles: Record<InsightType, string> = {
  POSITIVE_SIGNAL:      'Positive signals',
  COACHING_OPPORTUNITY: 'Coaching opportunities',
  RISK:                 'Areas to watch',
  GROWTH_PATTERN:       'Growth patterns',
  RECOGNITION:          'Recognition',
  WORKLOAD_SIGNAL:      'Workload signals',
  COMMUNICATION_SIGNAL: 'Communication signals',
  LEADERSHIP_SIGNAL:    'Leadership signals',
};

/**
 * InsightList
 *
 * Groups insights by type and renders them in a fixed, coach-friendly order.
 * Positive signals and recognition come first -- this is a coaching tool, not a risk dashboard.
 */
export function InsightList({ insights, isLoading, error }: InsightListProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 animate-fade-in">
        <p className="text-sm font-medium text-amber-800">Could not load insights</p>
        <p className="mt-0.5 text-xs text-amber-600">
          Check that the backend is running and try again.
        </p>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <EmptyState
        title="No insights yet"
        description="Generate insights for a period using the form above. Insights are AI-generated interpretations grounded in observations and activity data."
      />
    );
  }

  // Group by type, preserving SECTION_ORDER
  const grouped = SECTION_ORDER.reduce<Partial<Record<InsightType, Insight[]>>>((acc, type) => {
    const items = insights.filter((i) => i.type === type);
    if (items.length > 0) acc[type] = items;
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-fade-in">
      {(Object.entries(grouped) as [InsightType, Insight[]][]).map(([type, items]) => (
        <section key={type}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
            {sectionTitles[type]}
          </h3>
          <div className="space-y-3">
            {items.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
