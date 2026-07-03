'use client';

import { useDeveloper } from '@/hooks/useDeveloper';
import { useInsights } from '@/hooks/useInsights';
import { DeveloperProfileHeader } from './developer-profile-header';
import { DeveloperTabs } from './developer-tabs';
import { InsightList } from '@/components/insights/insight-list';
import { GenerateInsightsForm } from '@/components/insights/generate-insights-form';
import { ContextPackDebugger } from '@/components/debug/context-pack-debugger';
import { Skeleton } from '@/components/ui/skeleton';

interface DeveloperInsightsProps {
  developerId: string;
}

/**
 * AiDisclaimer
 *
 * Persistent, non-dismissible strip shown above the insight list.
 * Sets the right expectation: these are patterns to explore, not verdicts.
 */
function AiDisclaimer(): React.ReactElement {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-4 py-3">
      {/* info icon */}
      <svg
        className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-stone-400 dark:text-stone-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
      </svg>
      <div>
        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
          AI-assisted suggestions based on available context. Use your judgment.
        </p>
        <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">
          These are patterns to explore in conversation, not conclusions.
        </p>
      </div>
    </div>
  );
}

/**
 * DeveloperInsights
 *
 * Shows existing insights grouped by type, plus the generate form at the top.
 * Insights are hypotheses, not conclusions. Language is always hedged by the backend.
 *
 * In development, a ContextPackDebugger panel is rendered at the bottom so
 * engineers can inspect the exact context the AI received for any period.
 * It is not visible in production.
 */
export function DeveloperInsights({ developerId }: DeveloperInsightsProps): React.ReactElement {
  const { developer, isLoading: devLoading } = useDeveloper(developerId);
  const { insights, isLoading: insightsLoading, error } = useInsights(developerId);

  const placeholderDeveloper = {
    id: developerId,
    name: 'Developer',
    role: 'Software Engineer',
    githubLogin: undefined,
    avatarUrl: undefined,
    createdAt: new Date().toISOString(),
  };

  return (
    <div>
      {devLoading ? (
        <div className="mb-8 flex items-start gap-5 border-b border-stone-200 dark:border-stone-700 pb-6">
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ) : (
        <DeveloperProfileHeader developer={developer ?? placeholderDeveloper} />
      )}

      <DeveloperTabs developerId={developerId} />

      <div className="space-y-4 animate-fade-in">
        <AiDisclaimer />
        <GenerateInsightsForm developerId={developerId} />
        <div className="pt-2">
          <InsightList insights={insights} isLoading={insightsLoading} error={error} />
        </div>

        {/* Developer tooling — not rendered in production */}
        <ContextPackDebugger developerId={developerId} />
      </div>
    </div>
  );
}
