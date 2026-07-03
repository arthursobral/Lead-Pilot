type BadgeVariant = 'default' | 'achievement' | 'concern' | 'coaching' | 'leadership'
  | 'signal' | 'insight' | 'milestone' | 'report';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

/**
 * Human-readable labels for timeline entry types.
 * Raw enum values are never shown to users.
 */
export const TIMELINE_TYPE_LABELS: Record<string, string> = {
  SIGNAL:          'GitHub signal',
  OBSERVATION:     'Observation',
  ACHIEVEMENT:     'Achievement',
  INSIGHT:         'Insight',
  REPORT:          'Report',
  MILESTONE:       'Milestone',
  METRIC_SNAPSHOT: 'Activity snapshot',
};

export const TIMELINE_TYPE_VARIANTS: Record<string, BadgeVariant> = {
  SIGNAL:          'signal',
  OBSERVATION:     'default',
  ACHIEVEMENT:     'achievement',
  INSIGHT:         'insight',
  REPORT:          'report',
  MILESTONE:       'milestone',
  METRIC_SNAPSHOT: 'default',
};

const variantClasses: Record<BadgeVariant, string> = {
  default:     'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400',
  achievement: 'bg-amber-50 text-amber-700',
  concern:     'bg-orange-50 text-orange-700',
  coaching:    'bg-sky-50 text-sky-700',
  leadership:  'bg-violet-50 text-violet-700',
  signal:      'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400',
  insight:     'bg-indigo-50 text-indigo-700',
  milestone:   'bg-emerald-50 text-emerald-700',
  report:      'bg-teal-50 text-teal-700',
};

export function Badge({ label, variant = 'default' }: BadgeProps): React.ReactElement {
  return (
    <span
      className={[
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
      ].join(' ')}
    >
      {label}
    </span>
  );
}
