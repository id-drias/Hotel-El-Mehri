'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { LanguageSwitcher } from './LanguageSwitcher';
import { SocialLinks } from './SocialLinks';
import { EASE_LUXE } from '@/components/motion';
import { wordmark } from '@/config';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { mainNav } from '@/lib/constants/navigation';
import { cn } from '@/lib/utils/cn';

/* Opening deals the rows out top to bottom; closing reverses the order and runs
   at roughly half the duration. Exits should always be faster than entrances —
   on the way in the visitor is being shown something, on the way out they have
   already decided and are waiting. */
const panelVariants: Variants = {
  hidden: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
  shown: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 14, transition: { duration: 0.35, ease: EASE_LUXE } },
  shown: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE_LUXE } },
};

export function MobileMenu({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on route change.
  useEffect(() => setOpen(false), [pathname]);

  // Lock the page behind the overlay, move focus into it, keep Tab inside it,
  // and hand focus back to the trigger on the way out.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Captured now: by the time cleanup runs the ref may point elsewhere.
    const trigger = triggerRef.current;

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    focusables()[0]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) return;

      // Drive every Tab ourselves rather than only wrapping at the two ends.
      // Safari omits links from the native tab order unless full keyboard
      // access is on, so an ends-only trap lets focus escape on the first Tab
      // there; moving focus explicitly behaves the same in every engine.
      event.preventDefault();

      const current = items.indexOf(document.activeElement as HTMLElement);
      const step = event.shiftKey ? -1 : 1;
      const next = current === -1 ? 0 : (current + step + items.length) % items.length;

      items[next]?.focus();
    };

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('openMenu')}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="flex h-11 w-11 cursor-pointer flex-col items-center justify-center gap-1.5 lg:hidden"
      >
        <span
          className={cn('h-px w-6 transition-colors', tone === 'light' ? 'bg-white' : 'bg-ink-900')}
        />
        <span
          className={cn('h-px w-6 transition-colors', tone === 'light' ? 'bg-white' : 'bg-ink-900')}
        />
      </button>

      {/* This panel is `position: fixed`, which resolves against the nearest
          ancestor carrying a transform, filter or perspective — not against the
          viewport. So <MobileMenu> must never be nested inside an animated
          wrapper: doing so silently collapses the full-screen overlay to the
          size of that wrapper. <Header> keeps it out of every motion element
          for exactly this reason; see the note there before moving it. */}
      <div
        id="mobile-menu"
        ref={panelRef}
        /* `inert` is what actually takes the closed panel out of the tab order —
           opacity/pointer-events only hide it visually and from the mouse. */
        inert={!open}
        className={cn(
          'fixed inset-0 z-[60] bg-ink-950 transition-opacity duration-500 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
      >
        {/* The panel is never unmounted — `inert` is what removes it from the
            tab order, and an AnimatePresence exit would take the whole thing
            out of the DOM and lose that guarantee. So the cascade is driven by
            `animate` on a permanent tree instead. */}
        <motion.div
          className="flex h-full flex-col px-8 py-8"
          variants={panelVariants}
          initial={false}
          animate={open ? 'shown' : 'hidden'}
        >
          <motion.div variants={rowVariants} className="flex items-center justify-between">
            <span
              id="mobile-menu-title"
              className="font-display keep-tracking text-xl tracking-[0.18em] text-white"
            >
              {wordmark.primary}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('closeMenu')}
              className="-me-3 flex h-11 w-11 cursor-pointer items-center justify-center text-3xl leading-none font-extralight text-white"
            >
              &times;
            </button>
          </motion.div>

          <nav className="mt-16 flex flex-col gap-7">
            {mainNav.map((item) => (
              // Only opacity and y — nothing here scales, so the 44px touch
              // targets stay 44px at every frame of the cascade.
              <motion.div key={item.key} variants={rowVariants}>
                <Link
                  href={item.href}
                  className="font-display text-3xl text-sand-100 transition-colors duration-500 hover:text-gold-400"
                >
                  {t(item.key)}
                </Link>
              </motion.div>
            ))}
          </nav>

          <motion.div
            variants={rowVariants}
            className="mt-auto flex items-center justify-between border-t border-white/10 pt-8"
          >
            <LanguageSwitcher tone="light" />
            <SocialLinks tone="light" />
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
