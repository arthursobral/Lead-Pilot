'use client';

import { useEffect, useRef, useState } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface DatePickerProps {
  /** ISO date string YYYY-MM-DD, or empty string. */
  value: string;
  onChange: (value: string) => void;
  /** Latest selectable date as YYYY-MM-DD. Defaults to today. */
  max?: string;
  className?: string;
}

function parseIso(iso: string): Date | null {
  if (!iso || iso.length < 10) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function toBrazilian(iso: string): string {
  if (!iso || iso.length < 10) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * DatePicker
 *
 * Calendar dropdown that displays dates in DD/MM/YYYY (Brazilian) format.
 * Internally produces YYYY-MM-DD strings for form consumption.
 * Future dates and days beyond `max` are disabled.
 */
export function DatePicker({
  value,
  onChange,
  max,
  className = '',
}: DatePickerProps): React.ReactElement {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const maxDate = max ? parseIso(max) : todayDate;

  const selectedDate = parseIso(value);

  const [viewYear,  setViewYear]  = useState(selectedDate?.getFullYear()  ?? todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth()     ?? todayDate.getMonth());
  const [open,      setOpen]      = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Build the day grid for the current view month
  const firstWeekday  = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth   = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(viewYear, viewMonth, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else                 { setViewMonth((m) => m - 1); }
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else                  { setViewMonth((m) => m + 1); }
  };

  const selectDay = (d: Date) => {
    onChange(toIso(d));
    setOpen(false);
  };

  const isDisabled = (d: Date): boolean => {
    if (!maxDate) return false;
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    return day > maxDate;
  };

  const isSelected = (d: Date): boolean =>
    Boolean(selectedDate) && toIso(d) === toIso(selectedDate!);

  const isToday = (d: Date): boolean => toIso(d) === toIso(todayDate);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600 hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
      >
        <svg
          className="h-3.5 w-3.5 flex-shrink-0 text-stone-400 dark:text-stone-500"
          fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={1.75}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
        </svg>
        <span className={value ? 'text-stone-800 dark:text-stone-200' : 'text-stone-400 dark:text-stone-500'}>
          {value ? toBrazilian(value) : 'DD/MM/YYYY'}
        </span>
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 shadow-xl animate-fade-in">
          {/* Month / year navigation */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-lg p-1 text-stone-400 dark:text-stone-500 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200"
              aria-label="Previous month"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg p-1 text-stone-400 dark:text-stone-500 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200"
              aria-label="Next month"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="mb-1 grid grid-cols-7">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="py-1 text-center text-[10px] font-medium text-stone-400 dark:text-stone-500">
                {wd}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const disabled = isDisabled(d);
              const selected = isSelected(d);
              const todayCell = isToday(d);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(d)}
                  className={[
                    'mx-auto flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-colors',
                    selected
                      ? 'bg-stone-900 dark:bg-stone-700 font-medium text-white'
                      : todayCell
                        ? 'font-medium text-stone-700 dark:text-stone-300 ring-1 ring-stone-300 dark:ring-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800'
                        : disabled
                          ? 'cursor-not-allowed text-stone-200 dark:text-stone-700'
                          : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800',
                  ].join(' ')}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
