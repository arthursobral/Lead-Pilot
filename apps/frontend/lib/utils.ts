/**
 * Shared utility functions.
 *
 * Kept minimal — utilities are added as pages require them.
 */

/**
 * Format a date string or Date object into a human-readable form.
 * Used throughout the timeline and observation views.
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Format a date as a relative string (e.g. "3 days ago").
 * Used in DeveloperCard to show last activity.
 */
export function formatRelativeDate(date: string | Date): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diff = (new Date(date).getTime() - Date.now()) / 1000;

  const thresholds: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [86400 * 7, 'day'],
    [86400 * 30, 'week'],
    [86400 * 365, 'month'],
    [Infinity, 'year'],
  ];

  let unit: Intl.RelativeTimeFormatUnit = 'second';
  let value = diff;
  let prev = 1;

  for (const [threshold, u] of thresholds) {
    if (Math.abs(diff) < threshold) {
      unit = u;
      value = diff / prev;
      break;
    }
    prev = threshold;
  }

  return rtf.format(Math.round(value), unit);
}

/**
 * Combine class names conditionally.
 * Lightweight alternative to clsx for simple cases.
 */
export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
