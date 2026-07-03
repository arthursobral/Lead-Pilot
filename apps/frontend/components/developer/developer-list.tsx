'use client';

import { useDevelopers } from '@/hooks/useDevelopers';
import { DeveloperCard } from './developer-card';
import { SkeletonDeveloperCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * DeveloperList
 *
 * Renders the full developer roster with infinite-scroll-style load-more.
 *
 * States:
 *   Loading    -- 4 skeleton cards (matches typical small team page)
 *   Error      -- inline retry panel, never an empty-state illustration
 *   Empty      -- contextual empty state with GitHub connection hint
 *   Data       -- staggered card list + Load more button when hasNextPage
 *
 * No ranking, scoring, or comparative signals.
 * Alphabetical order across all loaded pages.
 */
export function DeveloperList(): React.ReactElement {
  const {
    developers,
    total,
    isLoading,
    isFetchingMore,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useDevelopers();

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonDeveloperCard key={i} />
        ))}
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-6 py-8 shadow-card text-center animate-fade-in">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-stone-50 dark:bg-stone-900">
          <svg
            className="h-5 w-5 text-stone-300 dark:text-stone-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Could not load developers</p>
        <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
          Check that the backend is running, then try again.
        </p>
        <button
          onClick={refetch}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2 text-sm text-stone-600 dark:text-stone-400 transition-all duration-150 hover:bg-stone-50 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (developers.length === 0) {
    return (
      <EmptyState
        title="No developers yet"
        description="Once you connect a GitHub repository, your team will appear here."
        icon={
          <svg
            className="h-7 w-7 text-stone-300 dark:text-stone-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.25}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
        }
      />
    );
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* Count label -- plain text, no badge or metric framing */}
      {total > 0 && (
        <p className="mb-4 text-xs text-stone-400 dark:text-stone-500">
          {total === 1 ? '1 developer' : `${total} developers`}
        </p>
      )}

      <div className="space-y-2">
        {developers.map((dev, idx) => (
          <div
            key={dev.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
          >
            <DeveloperCard developer={dev} />
          </div>
        ))}
      </div>

      {/* Load more -- shown when there are additional pages */}
      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={fetchNextPage}
            disabled={isFetchingMore}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-5 py-2.5 text-sm text-stone-500 dark:text-stone-400 shadow-card transition-all duration-150 hover:bg-stone-50 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetchingMore ? (
              <>
                <svg
                  className="h-3.5 w-3.5 animate-spin text-stone-400 dark:text-stone-500"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Loading…
              </>
            ) : (
              'Load more'
            )}
          </button>
        </div>
      )}

      {/* Append skeletons below existing cards while next page loads */}
      {isFetchingMore && (
        <div className="mt-2 space-y-2">
          {[1, 2].map((i) => (
            <SkeletonDeveloperCard key={i} />
          ))}
        </div>
      )}
    </div>
  );
}
