import { Sidebar } from '@/components/layout/sidebar';
import { QueryProvider } from '@/components/layout/query-provider';

/**
 * Dashboard layout.
 *
 * Structure:
 *   ┌─────────────────────────────────┐
 *   │ Sidebar (240px, fixed)          │
 *   │  ┌───────────────────────────┐  │
 *   │  │ Main content (scrollable) │  │
 *   │  │  max-w-content, centered  │  │
 *   │  └───────────────────────────┘  │
 *   └─────────────────────────────────┘
 *
 * The sidebar is fixed so it stays visible while the main area scrolls.
 * Content is capped at max-w-content (720px) — keeps prose readable
 * and avoids the wide-table aesthetic of analytics tools.
 *
 * QueryProvider wraps only this layout so TanStack Query
 * is scoped to authenticated pages.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <QueryProvider>
      <div className="flex h-full min-h-screen bg-stone-50 dark:bg-stone-950">
        <Sidebar />
        <main className="ml-[240px] flex-1 overflow-y-auto">
          <div className="mx-auto max-w-content px-8 py-10">
            {children}
          </div>
        </main>
      </div>
    </QueryProvider>
  );
}
