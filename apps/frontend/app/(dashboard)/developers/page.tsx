import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { DeveloperList } from '@/components/developer/developer-list';

export const metadata: Metadata = {
  title: 'Developers',
};

/**
 * Developer list page -- /developers
 *
 * Lists all developers the Team Lead is following.
 * No ranking or comparison between developers.
 */
export default function DevelopersPage(): React.ReactElement {
  return (
    <div>
      <PageHeader
        title="Developers"
        description="Your team members. Select anyone to review their story and prepare for a conversation."
        action={
          <Link
            href="/observations/new"
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 dark:bg-stone-700 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-stone-700 dark:hover:bg-stone-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add observation
          </Link>
        }
      />

      <DeveloperList />
    </div>
  );
}
