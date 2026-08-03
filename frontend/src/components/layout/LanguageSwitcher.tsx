'use client';

import { useParams } from 'next/navigation';

import { Link, usePathname } from '@/lib/i18n/navigation';
import { locales, type Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils/cn';

const labels: Record<Locale, string> = { fr: 'FR', ar: 'ع' };

type Props = { tone?: 'dark' | 'light'; className?: string };

/**
 * Swaps the locale on the *current* pathname. The old site rebuilt the URL by
 * splitting document.URL, which broke on nested routes and query strings.
 */
export function LanguageSwitcher({ tone = 'dark', className }: Props) {
  const pathname = usePathname();
  const params = useParams();
  const current = params.locale as Locale;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {locales.map((locale, index) => (
        <span key={locale} className="flex items-center gap-2">
          {index > 0 ? (
            <span className={tone === 'light' ? 'text-white/30' : 'text-ink-400/50'}>/</span>
          ) : null}
          <Link
            href={pathname}
            locale={locale}
            aria-current={locale === current ? 'true' : undefined}
            className={cn(
              'text-[0.6875rem] uppercase tracking-[0.18em] transition-colors duration-500',
              locale === current
                ? tone === 'light'
                  ? 'text-gold-300'
                  : 'text-gold-600'
                : tone === 'light'
                  ? 'text-white/60 hover:text-white'
                  : 'text-ink-400 hover:text-ink-900',
            )}
          >
            {labels[locale]}
          </Link>
        </span>
      ))}
    </div>
  );
}
