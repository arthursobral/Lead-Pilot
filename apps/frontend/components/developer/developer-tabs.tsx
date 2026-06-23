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
 * Sub-navigation for the developer profile page.
 * Tabs: Overview | Timeline | Insights
 *
 * Implemented as real links (not JS state) so each tab is a
 * distinct URL — shareable, browser-history-friendly, and
 * compatible with Next.js streaming/suspense per tab.
 */
export function DeveloperTabs({ developerId }: DeveloperTabsProps): React.ReactElement {
  const pathname = usePathname();

  const tabs: Tab[] = [
    { label: 'Overview', href: `/developers/${developerId}` },
    { label: 'Timeline', href: `/developers/${developerId}/timeline` },
    { label: 'Insights', href: `/developers/${developerId}/insights` },
  ];

  return (
    <div className="mb-6 flex gap-1 border-b border-stone-200">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              'relative px-3 py-2 text-sm transition-colors',
              active
                ? 'font-medium text-stone-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-stone-900'
                : 'text-stone-500 hover:text-stone-700',
            ].join(' ')}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
