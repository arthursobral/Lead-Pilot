'use client';

import { useState } from 'react';
import { useContextPack } from '@/hooks/useContextPack';

interface ContextPackDebuggerProps {
  developerId: string;
}

/**
 * ContextPackDebugger
 *
 * Developer-only collapsible panel that fetches and renders the Context Pack
 * for a given developer and period as formatted JSON.
 *
 * The Context Pack is the structured input the AI receives before generating
 * insights -- inspecting it explains why the AI produced the output it did.
 *
 * NEVER rendered in production. The NODE_ENV guard is enforced at runtime
 * (after hooks, per React rules) AND relies on Next.js replacing
 * process.env.NODE_ENV with a build-time constant, so production builds
 * dead-code-eliminate the rendered output entirely.
 */
export function ContextPackDebugger({ developerId }: ContextPackDebuggerProps): React.ReactElement | null {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [isOpen,      setIsOpen]      = useState(false);
  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd,   setPeriodEnd]   = useState(defaultEnd);
  const [fetchParams, setFetchParams] = useState<{
    periodStart: string;
    periodEnd: string;
  } | null>(null);

  const { data, isLoading, error } = useContextPack(developerId, fetchParams);

  // Production guard — placed after hooks to satisfy React rules.
  // Next.js replaces process.env.NODE_ENV at build time, so this branch is
  // statically eliminated in production bundles.
  if (process.env.NODE_ENV === 'production') return null;

  const handleFetch = () => {
    if (!periodStart || !periodEnd) return;
    setFetchParams({ periodStart, periodEnd });
  };

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-amber-200 bg-amber-50/40">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors hover:bg-amber-50/60"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {/* Terminal icon */}
          <svg
            className="h-3.5 w-3.5 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-600">
            Dev only
          </span>
          <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
            Context Pack Inspector
          </span>
        </div>
        {/* Chevron */}
        <svg
          className={[
            'h-4 w-4 text-stone-400 dark:text-stone-500 transition-transform duration-150',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible body */}
      {isOpen && (
        <div className="border-t border-amber-200/60 px-4 pb-5 pt-4">
          <p className="mb-4 text-xs text-stone-400 dark:text-stone-500 leading-relaxed">
            Inspect the Context Pack that the AI receives for a given period.
            The pack includes facts, observations, metrics, and timeline entries.
            Not visible in production.
          </p>

          {/* Period picker + fetch trigger */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                From
              </label>
              <input
                type="date"
                value={periodStart}
                max={periodEnd}
                onChange={(e) => setPeriodStart(e.target.value)}
                disabled={isLoading}
                className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:opacity-50 transition-opacity"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                To
              </label>
              <input
                type="date"
                value={periodEnd}
                min={periodStart}
                onChange={(e) => setPeriodEnd(e.target.value)}
                disabled={isLoading}
                className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:opacity-50 transition-opacity"
              />
            </div>
            <button
              type="button"
              onClick={handleFetch}
              disabled={isLoading || !periodStart || !periodEnd}
              className="rounded-lg border border-amber-200 bg-white dark:bg-stone-900 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-40 transition-colors"
            >
              {isLoading ? 'Loading…' : 'Fetch context pack'}
            </button>
          </div>

          {/* Error state */}
          {error && (
            <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
              <p className="text-xs font-medium text-red-700">
                Failed to fetch context pack
              </p>
              <p className="mt-0.5 text-xs text-red-500">{error.message}</p>
            </div>
          )}

          {/* Empty state — fetched but no data */}
          {!isLoading && !error && fetchParams !== null && data === undefined && (
            <p className="text-xs text-stone-400 dark:text-stone-500">No data returned for this period.</p>
          )}

          {/* Prompt before first fetch */}
          {!isLoading && fetchParams === null && (
            <p className="text-xs text-stone-300 dark:text-stone-600 italic">
              Select a period and click Fetch to inspect the context pack.
            </p>
          )}

          {/* JSON output */}
          {data !== undefined && (
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Context Pack
              </p>
              <pre className="overflow-auto rounded-xl bg-stone-900 dark:bg-stone-700 p-4 text-[11px] leading-relaxed text-stone-200 dark:text-stone-700 font-mono max-h-[32rem]">
                <code>{JSON.stringify(data, null, 2)}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
