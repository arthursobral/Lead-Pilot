interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * PageHeader
 *
 * Consistent top-of-page header across all main views.
 * Title leads at medium weight, description follows at stone-400.
 * Action slot for primary CTA sits right-aligned.
 */
export function PageHeader({ title, description, action }: PageHeaderProps): React.ReactElement {
  return (
    <div className="mb-8 flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-stone-400 dark:text-stone-500">{description}</p>
        )}
      </div>
      {action && <div className="ml-6 flex-shrink-0">{action}</div>}
    </div>
  );
}
