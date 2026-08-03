import { brand, wordmark } from '@/config';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

type Props = { tone?: 'dark' | 'light'; className?: string };

export function Logo({ tone = 'dark', className }: Props) {
  return (
    <Link
      href="/"
      className={cn('group flex flex-col leading-none', className)}
      aria-label={brand.name}
    >
      <span
        className={cn(
          /* Latin wordmark: keep its tracking even on Arabic pages. */
          'font-display keep-tracking text-2xl tracking-[0.18em] transition-colors duration-500',
          tone === 'light' ? 'text-white' : 'text-ink-900',
        )}
      >
        {wordmark.primary}
      </span>
      <span
        className={cn(
          'keep-tracking mt-1 text-[0.5625rem] tracking-[0.5em] transition-colors duration-500',
          tone === 'light' ? 'text-gold-300' : 'text-gold-600',
        )}
      >
        {wordmark.secondary}
      </span>
    </Link>
  );
}
