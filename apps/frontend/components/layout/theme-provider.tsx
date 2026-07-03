'use client';

import { useEffect } from 'react';

/**
 * ThemeProvider
 *
 * Applies the persisted theme class on first client render.
 * Works in tandem with the anti-FOUC script in layout.tsx.
 * Theme toggling is handled directly by ThemeToggle.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  useEffect(() => {
    const stored = localStorage.getItem('lead-pilot-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = stored === 'dark' || (!stored && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  return <>{children}</>;
}
