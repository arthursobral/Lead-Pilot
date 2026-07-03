/**
 * Skeleton loaders -- gentle shimmer placeholders while content is loading.
 */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps): React.ReactElement {
  return (
    <div
      className={['rounded-md skeleton-shimmer', className].join(' ')}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard(): React.ReactElement {
  return (
    <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-4 shadow-card space-y-3">
      <Skeleton className="h-2.5 w-1/3" />
      <Skeleton className="h-2.5 w-full" />
      <Skeleton className="h-2.5 w-4/5" />
    </div>
  );
}

export function SkeletonDeveloperCard(): React.ReactElement {
  return (
    <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-4 shadow-card flex items-center gap-4">
      <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-2.5 w-32" />
        <Skeleton className="h-2.5 w-20" />
      </div>
    </div>
  );
}
