interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
} as const;

/**
 * Avatar
 *
 * Displays a GitHub avatar or falls back to initials.
 * Uses neutral stone tones — no color-coding by person.
 * Color-coding avatars can imply ranking; we avoid that.
 */
export function Avatar({ name, imageUrl, size = 'md' }: AvatarProps): React.ReactElement {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover ring-1 ring-stone-200`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-stone-200 font-medium text-stone-600`}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
