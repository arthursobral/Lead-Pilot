interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

/**
 * EmptyState
 *
 * Used when a list or section has no data yet.
 * Kept text-forward — no heavy illustration that would feel like a marketing page.
 */
export function EmptyState({ title, description, action }: EmptyStateProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white px-8 py-12 text-center">
      <h3 className="text-sm font-medium text-stone-900">{title}</h3>
      <p className="mt-1 text-sm text-stone-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
