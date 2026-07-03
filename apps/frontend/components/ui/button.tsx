'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-stone-900 dark:bg-stone-700 text-white hover:bg-stone-700 dark:hover:bg-stone-600 disabled:bg-stone-300 dark:disabled:bg-stone-700 disabled:text-stone-500 dark:disabled:text-stone-400',
  secondary:
    'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600 disabled:opacity-50',
  ghost:
    'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 disabled:opacity-50',
  danger:
    'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps): React.ReactElement {
  return (
    <button
      disabled={disabled || isLoading}
      className={[
        'inline-flex items-center gap-2 font-medium transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 dark:focus-visible:ring-stone-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {isLoading && (
        // Combined animation: spin + fade-in so the spinner doesn't snap in abruptly.
        // Uses arbitrary value to set both animations on the same property.
        <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent opacity-60 [animation:spin_1s_linear_infinite,fade-in_150ms_ease-out_both]" />
      )}
      {children}
    </button>
  );
}
