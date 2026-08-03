'use client';

import { useEffect, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { LanguageSwitcher } from './LanguageSwitcher';
import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';
import { Navbar } from './Navbar';
import { chromeChild, EASE_LUXE, Magnetic, ScrollProgress } from '@/components/motion';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

/**
 * Transparent over the hero, then settles into a solid sand bar once the page
 * scrolls. `overlay` is false on pages that open with a light banner.
 *
 * The bar descends once on load and its contents follow in sequence. It is
 * deliberately the *last* thing to arrive: the hero copy is what the visitor
 * came for, so the chrome waits 400ms and lets the headline have the opening.
 */
export function Header({ overlay = true }: { overlay?: boolean }) {
  const t = useTranslations('nav');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const solid = scrolled || !overlay;

  return (
    <>
      <ScrollProgress />

      <motion.header
        data-motion
        variants={bar}
        initial="hidden"
        animate="shown"
        className={cn(
          /* Explicit properties rather than `transition-all`: that shorthand
             also transitions `transform`, which Framer rewrites every frame,
             so the two would fight over the entrance and the bar would arrive
             visibly late and rubbery. */
          'fixed inset-x-0 top-0 z-50 transition-[background-color,padding,box-shadow,backdrop-filter] duration-700',
          solid
            ? 'bg-sand-50/95 py-4 shadow-[0_1px_0_0_rgb(31_27_21/0.08)] backdrop-blur-md'
            : 'bg-gradient-to-b from-ink-950/60 to-transparent py-7',
        )}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 sm:px-8">
          <motion.div variants={chromeChild}>
            <Logo tone={solid ? 'dark' : 'light'} />
          </motion.div>

          <Navbar tone={solid ? 'dark' : 'light'} className="hidden lg:flex" />

          {/* Plain <div>. The action group is NOT a motion element and must not
              become one: it contains <MobileMenu>, whose overlay is
              `position: fixed`, and a transformed ancestor would become that
              overlay's containing block — collapsing a full-screen menu to the
              width of these three controls. The two animated items each carry
              their own wrapper instead, and the menu sits outside both. */}
          <div className="flex items-center gap-4">
            <motion.div variants={chromeChild} className="hidden sm:block">
              <LanguageSwitcher tone={solid ? 'dark' : 'light'} />
            </motion.div>

            <motion.div variants={chromeChild} className="hidden sm:block">
              <Magnetic strength={4}>
                <Button
                  href="/reservation"
                  variant={solid ? 'primary' : 'light'}
                  className="px-6 py-3"
                >
                  {t('reserve')}
                </Button>
              </Magnetic>
            </motion.div>

            <MobileMenu tone={solid ? 'dark' : 'light'} />
          </div>
        </div>
      </motion.header>
    </>
  );
}

/**
 * The bar fades; it does not travel.
 *
 * A `y` here would read beautifully and cost the mobile menu its overlay: any
 * transform on this element makes it the containing block for the
 * `position: fixed` panel nested inside it, so the full-screen menu would open
 * as a strip the size of the header. The descent lives on the children instead
 * — they arrive from above, which reads as the bar settling into place, and
 * none of them has a fixed-position descendant.
 */
const bar: Variants = {
  hidden: { opacity: 0 },
  shown: {
    opacity: 1,
    transition: {
      duration: 1.1,
      ease: EASE_LUXE,
      delay: 0.15,
      staggerChildren: 0.09,
      delayChildren: 0.4,
    },
  },
};
