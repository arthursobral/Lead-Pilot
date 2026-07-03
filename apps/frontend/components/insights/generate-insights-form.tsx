'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { useGenerateInsights } from '@/hooks/useGenerateInsights';

interface GenerateInsightsFormProps {
  developerId: string;
}

/**
 * GenerateInsightsForm
 *
 * Period picker + trigger for AI insight generation.
 * Defaults to the current calendar month.
 * Honest about generation time -- 30-90s on local models.
 */
export function GenerateInsightsForm({ developerId }: GenerateInsightsFormProps): React.ReactElement {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd,   setPeriodEnd]   = useState(defaultEnd);

  const { generate, isPending, error, isSuccess } = useGenerateInsights(developerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodStart || !periodEnd) return;
    await generate({
      periodStart: new Date(periodStart).toISOString(),
      periodEnd:   new Date(periodEnd).toISOString(),
    }).catch(() => { /* error captured in hook */ });
  };

  return (
    <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-4 shadow-card">
      <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">Generate insights</p>
      <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-400 dark:text-stone-500">From</label>
          <input
            type="date"
            value={periodStart}
            max={periodEnd}
            onChange={(e) => setPeriodStart(e.target.value)}
            disabled={isPending}
            className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-1.5 text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600 disabled:opacity-40 transition-opacity"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-400 dark:text-stone-500">To</label>
          <input
            type="date"
            value={periodEnd}
            min={periodStart}
            onChange={(e) => setPeriodEnd(e.target.value)}
            disabled={isPending}
            className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-1.5 text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600 disabled:opacity-40 transition-opacity"
          />
        </div>
        <Button type="submit" variant="primary" isLoading={isPending} disabled={!periodStart || !periodEnd}>
          {isPending ? 'Generating…' : 'Generate'}
        </Button>
      </form>

      {isPending && (
        <p className="mt-3 text-xs text-stone-400 dark:text-stone-500 animate-fade-in">
          Analysing activity data for this period. Generation typically takes 30–90 seconds on local models.
        </p>
      )}

      {error && (
        <div className="mt-3 animate-fade-in">
          <Alert variant="warning">{error}</Alert>
        </div>
      )}

      {isSuccess && !isPending && (
        <div className="mt-3 animate-fade-in">
          <Alert variant="success">Insights generated — the list below has been updated.</Alert>
        </div>
      )}
    </div>
  );
}
