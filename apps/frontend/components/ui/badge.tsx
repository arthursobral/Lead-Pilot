interface BadgeProps {
  label: string;
  variant?: 'default' | 'achievement' | 'concern' | 'coaching' | 'leadership';
}

/**
 * Variant map for observation types.
 *
 * Design intention: muted, not alarming.
 * - achievement: warm amber (celebratory but not loud)
 * - concern: soft orange (notable but not red/alarming — we never want
 *   the UI to feel punitive)
 * - coaching: soft blue-gray
 * - leadership: soft purple-gray
 * - default: stone (neutral)
 */
const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-stone-100 text-stone-600',
  achievement: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  concern: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  coaching: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  leadership: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
};

export function Badge({ label, variant = 'default' }: BadgeProps): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {label}
    </span>
  );
}
