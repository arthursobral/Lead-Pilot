import { redirect } from 'next/navigation';

/**
 * Root redirect.
 * The primary entry point is the developers roster.
 */
export default function RootPage(): never {
  redirect('/developers');
}
