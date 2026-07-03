'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Tab {
  label: string;
  href: string;
}

interface DeveloperTabsProps {
  developerId: string;
}

/**
 * DeveloperTabs
 *
 * Linear-style underline tabs for the developer profile.
 * Active: stone-900 text + 1.5px bottom border line (animate-fade-in on mount)
 * Inactive: stone-400 text, smooth hover to stone-700
 */
export function DeveloperTabs({ developerId }: DeveloperTabsProps): React.ReactElement {
  const pathname = usePathname();

  const tabs: Tab[] = [
    { label: 'Overview', href: `/developers/${developerId}` },
    { label: 'Timeline', href: `/developers/${developerId}/timeline` },
    { label: 'Insights', href: `/developers/${developerId}/insights` },
  ];

  return (
    <div className="mb-7 flex border-b border-stone-100 dark:border-stone-800">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              'relative px-4 py-2.5 text-sm transition-colors duration-150 select-none',
              active
                ? 'font-medium text-stone-900 dark:text-stone-100'
                : 'text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200',
            ].join(' ')}
          >
            {tab.label}
            {active && (
              <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-stone-900 dark:bg-stone-700 rounded-full animate-fade-in" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
