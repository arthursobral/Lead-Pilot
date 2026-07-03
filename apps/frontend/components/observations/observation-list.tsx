'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useObservations } from '@/hooks/useObservations';
import { ObservationCard } from './observation-card';
import { ObservationForm } from './observation-form';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { Observation } from '@/types/observation';

// ---------------------------------------------------------------------------
// Edit dialog
// ---------------------------------------------------------------------------

interface ObservationEditDialogProps {
  observation: Observation;
  developerId: string;
  onClose: () => void;
}

/**
 * ObservationEditDialog
 *
 * Modal overlay containing ObservationForm in edit mode.
 * Locks scroll while open. Closes on backdrop click or successful save.
 * Backdrop fades in (animate-fade-in) so the overlay doesn't snap to full
 * opacity -- the card inside uses animate-fade-in-up for a layered entrance.
 */
function ObservationEditDialog({
  observation,
  developerId,
  onClose,
}: ObservationEditDialogProps): React.ReactElement {
  // Lock body scroll while dialog is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 backdrop-blur-[2px] p-4 pt-14 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit observation"
      >
        {/* Dialog header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-medium text-stone-700 dark:text-stone-300">Edit observation</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ObservationForm
          developerId={developerId}
          observation={observation}
          onSuccess={onClose}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ObservationListSkeleton(): React.ReactElement {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-4 shadow-card"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="mt-[7px] h-1.5 w-1.5 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ObservationList
// ---------------------------------------------------------------------------

interface ObservationListProps {
  developerId: string;
  /**
   * Optional cap on displayed items. Used by DeveloperOverview to show
   * only the 5 most recent. The full list page passes no limit.
   */
  limit?: number;
}

/**
 * ObservationList
 *
 * Self-contained list component: fetches, renders, and manages CRUD state.
 * Edit opens an inline dialog; delete is two-step with inline confirmation.
 *
 * Sorted newest-first. The limit prop supports the developer overview preview
 * (5 most recent) while the same component powers the full list page.
 */
export function ObservationList({ developerId, limit }: ObservationListProps): React.ReactElement {
  const [editingObservation, setEditingObservation] = useState<Observation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { observations, isLoading, error, deleteObservation } = useObservations(developerId);

  const sorted = [...observations].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  const displayed = limit ? sorted.slice(0, limit) : sorted;

  const handleDelete = async (obs: Observation) => {
    setDeletingId(obs.id);
    try {
      await deleteObservation(obs.id);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) return <ObservationListSkeleton />;

  if (error) {
    return (
      <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-6 shadow-card text-center animate-fade-in">
        <svg
          className="mx-auto mb-3 h-5 w-5 text-stone-300 dark:text-stone-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <p className="text-sm text-stone-500 dark:text-stone-400">Could not load observations.</p>
        <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
          Check that the backend is running and try again.
        </p>
      </div>
    );
  }

  if (displayed.length === 0) {
    return (
      <EmptyState
        title="No observations yet"
        description="Record meaningful moments -- achievements, coaching opportunities, notable interactions -- to build context over time."
        icon={
          <svg className="h-6 w-6 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        }
        action={
          <Link
            href={`/observations/new?developerId=${developerId}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2 text-sm text-stone-600 dark:text-stone-400 transition-all duration-150 hover:bg-stone-50 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600"
          >
            Add observation
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="space-y-2">
        {displayed.map((obs, idx) => (
          <div
            key={obs.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
          >
            <ObservationCard
              observation={obs}
              onEdit={(o) => setEditingObservation(o)}
              onDelete={handleDelete}
              isDeleting={deletingId === obs.id}
            />
          </div>
        ))}
      </div>

      {editingObservation && (
        <ObservationEditDialog
          observation={editingObservation}
          developerId={developerId}
          onClose={() => setEditingObservation(null)}
        />
      )}
    </>
  );
}
