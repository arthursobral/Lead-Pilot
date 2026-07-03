interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

function DefaultIcon(): React.ReactElement {
  return (
    <svg
      className="h-7 w-7 text-stone-300 dark:text-stone-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.25}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

/**
 * EmptyState
 *
 * Shown when a list or section has no data yet.
 * Notion-style: icon-led, soft background, no harsh dashed border.
 * Fades in so the loading -> empty transition feels intentional, not abrupt.
 */
export function EmptyState({ title, description, action, icon }: EmptyStateProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-stone-50 dark:bg-stone-900 px-8 py-12 text-center animate-fade-in">
      <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-white dark:bg-stone-900 shadow-card">
        {icon ?? <DefaultIcon />}
      </div>
      <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-stone-400 dark:text-stone-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
