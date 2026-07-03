'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { ObservationList } from '@/components/observations/observation-list';
import { useDeveloper } from '@/hooks/useDeveloper';

/**
 * /developers/:id/observations
 *
 * Full observation list for a developer -- all entries with edit and delete.
 * The developer overview shows the 5 most recent; this page shows everything.
 *
 * Note: params is a plain object in Next.js 14. The Promise<> + use() pattern
 * is Next.js 15 syntax and would throw at runtime on Next.js 14.
 */

interface Props {
  params: { id: string };
}

function ObservationsContent({ id }: { id: string }): React.ReactElement {
  const { developer } = useDeveloper(id);
  const name = developer?.name ?? 'Developer';

  return (
    <div>
      <PageHeader
        title="Observations"
        description={`Context you have recorded for ${name}.`}
        action={
          <Link
            href={`/observations/new?developerId=${id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 dark:bg-stone-700 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-stone-700 dark:hover:bg-stone-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add observation
          </Link>
        }
      />

      <div className="mb-4">
        <Link
          href={`/developers/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to {name}
        </Link>
      </div>

      <ObservationList developerId={id} />
    </div>
  );
}

export default function DeveloperObservationsPage({ params }: Props): React.ReactElement {
  return <ObservationsContent id={params.id} />;
}
