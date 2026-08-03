'use client';

import { motion, type Variants } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { chromeChild } from '@/components/motion';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { mainNav } from '@/lib/constants/navigation';
import { cn } from '@/lib/utils/cn';

type Props = { tone?: 'dark' | 'light'; className?: string };

/**
 * The desktop nav.
 *
 * No `initial`/`animate` of its own: it inherits the header's `hidden` → `shown`
 * pass through Framer's variant propagation and adds one more level of stagger,
 * so the links deal themselves out left to right after the bar has landed.
 *
 * The gold hairline under each link is CSS (`.lyn-nav-link`) rather than a
 * layout animation. It scales rather than growing its width, which keeps it on
 * the compositor, and it is keyed to `:hover`, `:focus-visible` *and*
 * `[aria-current]` — so the current page is marked without a pointer ever
 * touching it.
 */
export function Navbar({ tone = 'dark', className }: Props) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <motion.nav variants={list} className={cn('items-center gap-9', className)}>
      {mainNav.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

        return (
          <motion.span key={item.key} variants={chromeChild} className="inline-flex">
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'lyn-nav-link relative text-[0.6875rem] tracking-[0.22em] uppercase transition-colors duration-500',
                tone === 'light'
                  ? cn('text-white/85 hover:text-white', active && 'text-white')
                  : cn('text-ink-500 hover:text-ink-900', active && 'text-ink-900'),
              )}
            >
              {t(item.key)}
            </Link>
          </motion.span>
        );
      })}
    </motion.nav>
  );
}

/* Tighter than the header's own step: seven links at 90ms would still be
   arriving well after the hero has finished. */
const list: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.05 } },
};
