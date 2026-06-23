import { Avatar } from '@/components/ui/avatar';
import type { Developer } from '@/types/developer';

interface DeveloperProfileHeaderProps {
  developer: Developer;
}

/**
 * DeveloperProfileHeader
 *
 * Top section of the /developers/[id] page.
 *
 * Shows: avatar, name, role, GitHub link.
 * Does NOT show: tenure metrics, PR counts, scores.
 *
 * The profile header frames the developer as a person, not a resource.
 */
export function DeveloperProfileHeader({ developer }: DeveloperProfileHeaderProps): React.ReactElement {
  return (
    <div className="mb-8 flex items-start gap-5 border-b border-stone-200 pb-6">
      <Avatar name={developer.name} imageUrl={developer.avatarUrl} size="lg" />
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-semibold text-stone-900">{developer.name}</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {developer.role ?? 'Software Engineer'}
        </p>
        {developer.githubLogin && (
          <a
            href={`https://github.com/${developer.githubLogin}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            @{developer.githubLogin}
          </a>
        )}
      </div>
    </div>
  );
}
