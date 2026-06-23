interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * PageHeader
 *
 * Consistent top-of-page header used across all main pages.
 *
 * Design: title + optional description + optional right-side action.
 * A bottom border separates it from the page content below.
 * No breadcrumbs at this stage — navigation is shallow enough.
 */
export function PageHeader({
  title,
  description,
  action,
}: PageHeaderProps): React.ReactElement {
  return (
    <div className="mb-8 flex items-start justify-between border-b border-stone-200 pb-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-stone-500">{description}</p>
        )}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
}
