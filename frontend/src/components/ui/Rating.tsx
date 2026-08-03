import { cn } from '@/lib/utils/cn';

type Props = {
  value: number;
  max?: number;
  label?: string;
  className?: string;
};

/**
 * Gold stars. With a `label` the group is announced as one image; without one
 * it is purely decorative and hidden, so callers that already render the rating
 * as visible text don't have it read out twice.
 */
export function Rating({ value, max = 5, label, className }: Props) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {Array.from({ length: max }, (_, index) => (
        <svg
          key={index}
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={cn('h-3.5 w-3.5', index < value ? 'fill-gold-400' : 'fill-transparent')}
          stroke="currentColor"
          strokeWidth={1}
        >
          <path d="M12 2.5l2.9 6.05 6.6.9-4.8 4.6 1.2 6.55L12 17.5l-5.9 3.1 1.2-6.55-4.8-4.6 6.6-.9z" />
        </svg>
      ))}
    </span>
  );
}
