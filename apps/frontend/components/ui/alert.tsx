/**
 * Alert -- calm, non-alarming notification strip.
 * Avoids red-heavy error states; uses amber for warnings, stone for info.
 */

type AlertVariant = 'info' | 'warning' | 'success' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
}

const variantClasses: Record<AlertVariant, string> = {
  info:    'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error:   'bg-stone-50 dark:bg-stone-900 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300',
};

export function Alert({
  variant = 'info',
  title,
  children,
}: AlertProps): React.ReactElement {
  return (
    <div className={['rounded-xl border px-4 py-3 text-sm', variantClasses[variant]].join(' ')}>
      {title && <p className="font-medium mb-0.5">{title}</p>}
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}
