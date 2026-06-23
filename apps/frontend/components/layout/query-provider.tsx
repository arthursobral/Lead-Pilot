'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * QueryProvider
 *
 * Creates a QueryClient instance per session (not a module-level singleton)
 * so state is not shared across users in server-rendered environments.
 *
 * Stale time of 60s is a reasonable default for this product — developer
 * data doesn't change by the second and we want the UI to feel snappy.
 */
export function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
