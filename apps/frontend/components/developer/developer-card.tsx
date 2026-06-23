import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import type { Developer } from '@/types/developer';

interface DeveloperCardProps {
  developer: Developer;
}

/**
 * DeveloperCard
 *
 * Used in the /developers list.
 *
 * Shows: avatar, name, role, last activity note.
 * Does NOT show: metrics, scores, PR counts.
 * The card links to the full developer profile.
 *
 * Design: minimal horizontal layout with a subtle hover state.
 * Treated like a notebook entry, not a data row.
 */
export function DeveloperCard({ developer }: DeveloperCardProps): React.ReactElement {
  return (
    <Link
      href={`/developers/${developer.id}`}
      className="group flex items-center gap-4 rounded-lg border border-stone-200 bg-white px-5 py-4 transition-colors hover:border-stone-300 hover:bg-stone-50"
    >
      <Avatar name={developer.name} imageUrl={developer.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-900 group-hover:text-stone-700">
          {developer.name}
        </p>
        <p className="mt-0.5 text-xs text-stone-500">
          {developer.role ?? 'Software Engineer'}
        </p>
      </div>
      <svg
        className="h-4 w-4 flex-shrink-0 text-stone-300 group-hover:text-stone-400"
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
