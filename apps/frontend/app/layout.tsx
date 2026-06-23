import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'LeadPilot',
    template: '%s · LeadPilot',
  },
  description: 'AI coaching assistant for engineering leaders.',
};

/**
 * Root layout.
 *
 * Keeps html/body structure minimal.
 * Providers (TanStack Query, auth context) are added in the
 * dashboard layout so they only wrap authenticated pages.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
