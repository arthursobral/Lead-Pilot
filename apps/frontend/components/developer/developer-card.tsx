'use client';

import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import type { DeveloperListItem } from '@/types/developer';

interface DeveloperCardProps {
  developer: DeveloperListItem;
}

/**
 * DeveloperCard
 *
 * Used in the /developers and / roster views.
 * Shows: avatar, name, role. Links to the developer profile.
 * No metrics, scores, or comparative signals -- a person, not a data row.
 */
export function DeveloperCard({ developer }: DeveloperCardProps): React.ReactElement {
  return (
    <Link
      href={`/developers/${developer.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-3.5 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 hover:border-stone-200 dark:hover:border-stone-700"
    >
      <Avatar name={developer.name} imageUrl={developer.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-900 dark:text-stone-100 transition-colors duration-150 group-hover:text-stone-700 dark:hover:text-stone-200">
          {developer.name}
        </p>
        <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">
          {developer.role ?? 'Software Engineer'}
        </p>
      </div>
      {developer.githubLogin && (
        <span className="flex-shrink-0 text-xs text-stone-300 dark:text-stone-600 font-mono">
          @{developer.githubLogin}
        </span>
      )}
      <svg
        className="h-4 w-4 flex-shrink-0 text-stone-200 dark:text-stone-700 transition-colors duration-150 group-hover:text-stone-400 dark:group-hover:text-stone-500 dark:group-hover:text-stone-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}
