'use client';

import { useState } from 'react';
import type { Observation, ObservationType, ObservationSeverity } from '@/types/observation';

interface ObservationCardProps {
  observation: Observation;
  onEdit?: (observation: Observation) => void;
  onDelete?: (observation: Observation) => void;
  isDeleting?: boolean;
}

const typeLabels: Record<ObservationType, string> = {
  ACHIEVEMENT:          'Achievement',
  CUSTOMER_FEEDBACK:    'Customer feedback',
  COACHING_OPPORTUNITY: 'Coaching opportunity',
  CONCERN:              'Concern',
  LEADERSHIP:           'Leadership',
  MENTORING:            'Mentoring',
  COMMUNICATION:        'Communication',
  INCIDENT:             'Incident',
  OWNERSHIP:            'Ownership',
  CONTEXT:              'Context',
};

const typeBadgeClasses: Partial<Record<ObservationType, string>> = {
  ACHIEVEMENT:          'bg-emerald-50 text-emerald-700',
  CUSTOMER_FEEDBACK:    'bg-sky-50 text-sky-700',
  LEADERSHIP:           'bg-violet-50 text-violet-700',
  MENTORING:            'bg-indigo-50 text-indigo-700',
  OWNERSHIP:            'bg-teal-50 text-teal-700',
  COACHING_OPPORTUNITY: 'bg-amber-50 text-amber-700',
  CONCERN:              'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400',
  INCIDENT:             'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400',
  COMMUNICATION:        'bg-stone-50 dark:bg-stone-900 text-stone-500 dark:text-stone-400',
  CONTEXT:              'bg-stone-50 dark:bg-stone-900 text-stone-400 dark:text-stone-500',
};

const severityDot: Record<ObservationSeverity, string> = {
  LOW:    'bg-stone-200 dark:bg-stone-700',
  MEDIUM: 'bg-amber-400',
  HIGH:   'bg-stone-500',
};

// ---------------------------------------------------------------------------
// Inline delete confirmation
// Two-step: "Remove" -> "Yes, remove / Cancel"
// The confirming state fades in so the user registers the change before acting.
// ---------------------------------------------------------------------------

interface DeleteControlProps {
  onDelete: () => void;
  isDeleting: boolean;
}

function DeleteControl({ onDelete, isDeleting }: DeleteControlProps): React.ReactElement {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-2 animate-fade-in">
        <button
          type="button"
          onClick={() => { setConfirming(false); onDelete(); }}
          disabled={isDeleting}
          className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-40"
        >
          {isDeleting ? 'Removing...' : 'Yes, remove'}
        </button>
        <span className="text-stone-200 dark:text-stone-700">|</span>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs text-stone-300 dark:text-stone-600 hover:text-stone-500 dark:hover:text-stone-400 transition-colors"
      aria-label="Remove observation"
    >
      Remove
    </button>
  );
}

// ---------------------------------------------------------------------------
// ObservationCard
// ---------------------------------------------------------------------------

/**
 * ObservationCard
 *
 * Displays a single manually-recorded observation.
 * Severity is a subtle dot -- nothing reads as a performance flag.
 * Type badge uses muted tones.
 *
 * Edit and delete actions are revealed on hover, keeping the read view clean.
 * Delete is two-step to prevent accidental removal of irreplaceable context.
 */
export function ObservationCard({
  observation,
  onEdit,
  onDelete,
  isDeleting = false,
}: ObservationCardProps): React.ReactElement {
  const badgeClass = typeBadgeClasses[observation.type] ?? 'bg-stone-50 dark:bg-stone-900 text-stone-400 dark:text-stone-500';
  const showActions = Boolean(onEdit || onDelete);

  return (
    <div className="group rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 animate-fade-in-up">
      <div className="flex items-start gap-3">
        {/* Significance dot */}
        <span
          className={[
            'mt-[7px] h-1.5 w-1.5 rounded-full flex-shrink-0',
            severityDot[observation.severity],
          ].join(' ')}
          title={`${observation.severity.toLowerCase()} significance`}
        />

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className={['rounded-md px-2 py-0.5 text-xs font-medium', badgeClass].join(' ')}>
              {typeLabels[observation.type]}
            </span>
            <span className="text-xs text-stone-300 dark:text-stone-600 tabular-nums">
              {new Date(observation.occurredAt).toLocaleDateString('pt-BR', {
                month: 'short',
                day:   'numeric',
                year:  'numeric',
              })}
            </span>

            {/* CRUD actions -- revealed on hover */}
            {showActions && (
              <div className="ml-auto flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(observation)}
                    className="text-xs text-stone-300 dark:text-stone-600 hover:text-stone-500 dark:hover:text-stone-400 transition-colors"
                    aria-label="Edit observation"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <DeleteControl
                    onDelete={() => onDelete(observation)}
                    isDeleting={isDeleting}
                  />
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed">{observation.summary}</p>
          {observation.detail && (
            <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-500 leading-relaxed">{observation.detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}
