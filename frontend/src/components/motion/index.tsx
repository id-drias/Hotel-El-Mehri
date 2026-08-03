'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  MotionConfig,
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from 'framer-motion';

import { cn } from '@/lib/utils/cn';

/**
 * The site's motion system.
 *
 * Five rules run through every primitive here:
 *
 * 1. **No render-time branching on reduced motion.** `useReducedMotion()` can
 *    only ever return `false` on the server, so branching on it during render
 *    emits one tree on the server and another on a reduced-motion client —
 *    a hydration mismatch (React #418). Reduced motion is handled instead by
 *    `<MotionStage reducedMotion="user">`, which Framer applies after mount, by
 *    CSS media queries for the looping ambient effects, and by `useMotionGate()`
 *    for the scroll-driven ones (see its note — `reducedMotion` does not reach
 *    motion values fed straight into `style`).
 * 2. Pointer and scroll effects run on motion values, never React state, so
 *    tilt, glow and parallax never trigger a re-render on move.
 * 3. Nothing important is hover-only — the design skill rates hover-only
 *    interaction High severity for touch. Tilt, glow and shimmer are pure
 *    decoration, every card still has a real link, and `:focus-within` gets
 *    everything `:hover` gets.
 * 4. Entrances fire once. Replaying content a visitor has already read is what
 *    makes an expensive site feel like a demo reel.
 * 5. Only transform, opacity and (sparingly) filter are animated. Nothing here
 *    animates width, height, top or left, so every entrance stays on the
 *    compositor and off the layout path.
 */

/** Expo-out — the same curve as --ease-luxe in tokens.css. */
const LUXE = [0.22, 1, 0.36, 1] as const;

/** Exported so components composing their own variants stay on the house curve. */
export const EASE_LUXE = LUXE;

/** Symmetric ease for things that travel both ways (curtains, panels). */
const LUXE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/**
 * Wraps the page. `reducedMotion="user"` makes Framer drop transform and layout
 * animation for visitors who ask for it, keeping only opacity — done internally,
 * after hydration, so the served markup is identical either way.
 */
export function MotionStage({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/* ------------------------------------------------------- the reduced gate -- */

/**
 * A motion value that is 1 normally and 0 under `prefers-reduced-motion`.
 *
 * `MotionConfig reducedMotion` only governs *animations*. A motion value piped
 * straight into `style` — which is how every scroll-driven effect below works —
 * bypasses it entirely, so parallax would keep moving for exactly the visitors
 * who asked it not to. Multiplying by this gate switches those effects off
 * without changing the rendered tree, and it is set from an effect, so the
 * server and the first client render always agree.
 */
function useMotionGate(): MotionValue<number> {
  const gate = useMotionValue(1);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => gate.set(query.matches ? 0 : 1);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, [gate]);

  return gate;
}

/* -------------------------------------------------------- the reveal gate -- */

/**
 * True once the element has been seen — or once we know it never will be.
 *
 * This replaces Framer's `whileInView`, which is backed by an
 * IntersectionObserver and therefore only ever fires for elements that
 * intersect *after* the observer attaches. Anything already scrolled past at
 * that moment never intersects and never animates, so it stays at `opacity: 0`
 * for the rest of the session. That is not a hypothetical:
 *
 *   - browsers restore scroll position on reload and on back-navigation, so a
 *     reader returning to the middle of a page loses everything above them;
 *   - a deep link to `#spa` lands below several sections that then never appear;
 *   - on a slow connection, scrolling before hydration strands whatever scrolled
 *     by in the meantime.
 *
 * The mount-time rect check catches all three: if the element is already above
 * the viewport, it is shown immediately rather than animated in from a position
 * the reader has passed.
 */
function useRevealed(ref: RefObject<Element | null>): boolean {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (revealed || !element) return;

    // Already gone by. Show it; there is nothing left to choreograph.
    if (element.getBoundingClientRect().bottom <= 0) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Two ways to qualify. The obvious one is that the element is on
        // screen. The second is that it has gone past: an IntersectionObserver
        // samples at frame boundaries, so if the main thread stalls — a long
        // task, a janky fast scroll on a slow phone — an element can be below
        // the viewport at one sample and above it at the next, never once
        // reported as intersecting. The entry still carries its rectangle, so
        // that case is recognisable rather than silently dropped.
        const seen = entries.some(
          (entry) => entry.isIntersecting || entry.boundingClientRect.bottom <= 0,
        );
        if (!seen) return;
        setRevealed(true);
        observer.disconnect();
      },
      // Matches the old viewport margin: the element has to be a little way in
      // before it counts as seen, so entrances don't fire on the very edge.
      { rootMargin: '0px 0px -10% 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, revealed]);

  return revealed;
}

/* ------------------------------------------------------------- entrances -- */

export const staggerParent: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

/**
 * Long grids get a tighter cadence. Past roughly eight tiles a 90ms step makes
 * the last item arrive a full second after the first, which reads as lag rather
 * than choreography.
 */
export const staggerParentTight: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 1.1, ease: LUXE } },
};

/**
 * Entrance for a piece of page chrome — it drops *down* into place rather than
 * rising, because the header itself arrives from above. Lives here rather than
 * in Header so Navbar can share it without the two importing each other.
 */
export const chromeChild: Variants = {
  hidden: { y: -10, opacity: 0 },
  shown: { y: 0, opacity: 1, transition: { duration: 0.9, ease: LUXE } },
};

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** Small by design — it should read as a fade, not a slide. */
  y?: number;
  /**
   * Adds a focus-pull: the content resolves out of a soft blur. Opt-in, because
   * an animated `filter` repaints its whole subtree on every frame — fine for a
   * heading or a badge, wasteful across a full-bleed section.
   */
  blur?: boolean;
  as?: 'div' | 'section' | 'li' | 'article' | 'p';
};

export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  blur = false,
  as = 'div',
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const revealed = useRevealed(ref);
  const Tag = motion[as] as typeof motion.div;

  return (
    <Tag
      ref={ref}
      className={className}
      data-motion
      initial={blur ? { opacity: 0, y, filter: 'blur(8px)' } : { opacity: 0, y }}
      animate={
        revealed
          ? blur
            ? { opacity: 1, y: 0, filter: 'blur(0px)' }
            : { opacity: 1, y: 0 }
          : undefined
      }
      transition={{ duration: 1.1, ease: LUXE, delay }}
    >
      {children}
    </Tag>
  );
}

/** Cascades its children in, one after the next. */
export function Stagger({
  children,
  className,
  tight = false,
  as = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  /** Use for grids of more than ~8 tiles. */
  tight?: boolean;
  as?: 'div' | 'ul';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const revealed = useRevealed(ref);
  const Tag = motion[as] as typeof motion.div;

  return (
    <Tag
      ref={ref}
      className={className}
      data-motion
      variants={tight ? staggerParentTight : staggerParent}
      initial="hidden"
      animate={revealed ? 'shown' : 'hidden'}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({
  children,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'article';
}) {
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag className={className} data-motion variants={staggerChild}>
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------ word reveal -- */

const wordChild: Variants = {
  hidden: { y: '110%' },
  shown: { y: '0%', transition: { duration: 1.15, ease: LUXE } },
};

/**
 * Headline that rises word by word out of a mask.
 *
 * Split by **word, never by character**. Arabic is a joined cursive script:
 * wrapping each letter in its own element severs the shaping run, so the
 * headline renders as isolated letterforms — the text equivalent of a crash.
 * Word boundaries are safe in both locales.
 *
 * The whole phrase is announced once from `aria-label`; the pieces are
 * `aria-hidden`, so assistive tech never hears it spelled out in fragments.
 */
export function WordReveal({
  text,
  className,
  delay = 0,
  as = 'h1',
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: 'h1' | 'h2' | 'p' | 'span';
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const revealed = useRevealed(ref);
  const Tag = motion[as] as typeof motion.h1;
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <Tag
      ref={ref}
      className={className}
      data-motion
      aria-label={text}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: 0.07, delayChildren: delay } },
      }}
      initial="hidden"
      animate={revealed ? 'shown' : 'hidden'}
    >
      {words.map((word, index) => (
        // The mask clips the word's start position. `overflow: hidden` on an
        // inline-block would also shear descenders off a display serif, so
        // .lyn-word pads the box and pulls the padding back out with a matching
        // negative margin.
        <span key={`${word}-${index}`} aria-hidden="true" className="lyn-word">
          <motion.span className="lyn-word-in" variants={wordChild}>
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/* --------------------------------------------------------------- magnetic -- */

/**
 * Button that leans toward the cursor. Capped at 6px — past roughly 8px it
 * stops feeling responsive and starts feeling broken, because the pointer no
 * longer lands where the control appears to be.
 */
export function Magnetic({
  children,
  className,
  strength = 6,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 150, damping: 18, mass: 0.6 });
  const y = useSpring(useMotionValue(0), { stiffness: 150, damping: 18, mass: 0.6 });

  return (
    <motion.span
      ref={ref}
      className={cn('inline-flex', className)}
      style={{ x, y }}
      onPointerMove={(event) => {
        // Coarse pointers never hover; skip the work entirely.
        if (event.pointerType !== 'mouse') return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        x.set(Math.max(-strength, Math.min(strength, (dx / rect.width) * strength * 2)));
        y.set(Math.max(-strength, Math.min(strength, (dy / rect.height) * strength * 2)));
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}

/* ------------------------------------------------------------ tilt + glow -- */

/**
 * 3D tilt with a pointer-tracked glow riding the card face.
 *
 * The glow is painted into a child's background from motion values, so a
 * mousemove costs one transform and one paint — no React render, no layout.
 */
export function TiltCard({
  children,
  className,
  /** Degrees. Kept low: a hotel card is not a trading-card game. */
  max = 5,
  as = 'article',
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
  as?: 'article' | 'div';
}) {
  const ref = useRef<HTMLDivElement>(null);

  const rx = useSpring(useMotionValue(0), { stiffness: 140, damping: 20 });
  const ry = useSpring(useMotionValue(0), { stiffness: 140, damping: 20 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(0);
  const glow = useMotionTemplate`radial-gradient(22rem 16rem at ${gx}% ${gy}%, rgba(189,154,92,0.30), transparent 68%)`;

  const Tag = motion[as] as typeof motion.div;

  return (
    <Tag
      ref={ref}
      className={cn('lyn-tilt', className)}
      data-motion
      variants={staggerChild}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1100 }}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse') return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        ry.set((px - 0.5) * max * 2);
        rx.set(-(py - 0.5) * max * 2);
        gx.set(px * 100);
        gy.set(py * 100);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
        gy.set(0);
      }}
    >
      <motion.span aria-hidden="true" className="lyn-tilt-glow" style={{ background: glow }} />
      {children}
    </Tag>
  );
}

/* --------------------------------------------------------- scroll-driven -- */

/**
 * Reading-progress hairline pinned to the top of the viewport.
 *
 * Purely informational and decorative, hence `aria-hidden`: the scrollbar
 * already conveys this to assistive tech, and a second announcement of it is
 * noise.
 */
export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  // Not gated on reduced motion, and deliberately: this is a position readout,
  // not autonomous movement. It only ever moves because the visitor is
  // scrolling, exactly like the scrollbar it doubles for. The spring just keeps
  // it from twitching on a trackpad's noisier deltas.
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <motion.span aria-hidden="true" className={cn('lyn-progress', className)} style={{ scaleX }} />
  );
}

/**
 * Scroll-scrubbed drift for decorative layers.
 *
 * Background and imagery only — never body copy or controls. The design skill
 * flags parallaxed text as a motion-sickness trigger, and a control that slides
 * under the cursor as it is clicked is worse than no effect at all.
 */
export function Parallax({
  children,
  className,
  /** Total travel across the whole pass, in pixels. Kept small on purpose. */
  distance = 60,
}: {
  children: React.ReactNode;
  className?: string;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const gate = useMotionGate();
  const { scrollY } = useScroll();

  /**
   * Progress is derived from the wrapper's live rect on each scroll frame
   * rather than from `useScroll({ target })`.
   *
   * The target form caches the element's geometry, and for a full-bleed layer
   * that cache is taken before the hero image has settled — so the value stays
   * pinned at its starting offset for the first several hundred pixels of
   * scroll and then jumps once something happens to force a re-measure. Reading
   * the rect here is one layout read per layer per frame, taken during Framer's
   * update phase (before any style is written), so it never interleaves reads
   * with writes and never thrashes.
   */
  const offsetFor = useCallback(() => {
    const element = ref.current;
    if (!element || gate.get() === 0) return 0;

    const rect = element.getBoundingClientRect();
    const viewport = window.innerHeight;
    const span = viewport + rect.height;
    if (span <= 0) return 0;

    // 0 when the layer's top edge sits on the viewport's bottom edge, 1 when
    // its bottom edge sits on the viewport's top edge.
    const progress = Math.min(1, Math.max(0, (viewport - rect.top) / span));
    return (progress - 0.5) * distance;
  }, [distance, gate]);

  const raw = useTransform(scrollY, offsetFor);
  const y = useSpring(raw, { stiffness: 90, damping: 26, mass: 0.4 });

  // Scroll is what drives the transform, so without this the layer would hold
  // its first-render value until the visitor moves — including the moment the
  // reduced-motion gate closes, which would otherwise land as a single lurch
  // on the next scroll. `jump` sets the spring without playing it.
  useEffect(() => {
    const settle = () => {
      const value = offsetFor();
      raw.set(value);
      y.jump(value);
    };

    settle();
    window.addEventListener('resize', settle);
    const unsubscribe = gate.on('change', settle);
    return () => {
      window.removeEventListener('resize', settle);
      unsubscribe();
    };
  }, [gate, offsetFor, raw, y]);

  // Two elements, and it has to be two: the measured wrapper must never carry
  // the transform this hook is producing, or the rect it reads would chase its
  // own output. The outer node is measured; the inner one moves.
  return (
    <div ref={ref} className={className}>
      <motion.div className="lyn-parallax-inner" style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Image that is uncovered by a gold curtain sliding up off its face, while the
 * photograph itself settles out of a slow overscale.
 *
 * Both halves are transforms, so `reducedMotion="user"` snaps them to their
 * resting state instead of playing them — the picture is simply there.
 */
export function CurtainImage({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const revealed = useRevealed(ref);

  return (
    <motion.div
      ref={ref}
      className={cn('lyn-curtain', className)}
      data-motion
      initial="hidden"
      animate={revealed ? 'shown' : 'hidden'}
    >
      <motion.div
        className="lyn-curtain-media"
        variants={{
          hidden: { scale: 1.14 },
          shown: { scale: 1, transition: { duration: 1.8, ease: LUXE, delay } },
        }}
      >
        {children}
      </motion.div>
      <motion.span
        aria-hidden="true"
        className="lyn-curtain-veil"
        variants={{
          hidden: { scaleY: 1 },
          shown: { scaleY: 0, transition: { duration: 1.25, ease: LUXE_IN_OUT, delay } },
        }}
      />
    </motion.div>
  );
}

/* ---------------------------------------------------------------- ambient -- */

/**
 * Ambient light and float are plain CSS, not Framer.
 *
 * They are infinite decorative loops with no scroll or pointer logic, so CSS
 * does them for free — and `@media (prefers-reduced-motion: reduce)` switches
 * them off with no JS, no conditional rendering and no hydration risk at all.
 */
export function AmbientField({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('lyn-ambient', className)}>
      <span className="lyn-ambient-a" />
      <span className="lyn-ambient-b" />
    </span>
  );
}

export function Float({
  children,
  className,
  slow = false,
}: {
  children: React.ReactNode;
  className?: string;
  slow?: boolean;
}) {
  return <div className={cn(slow ? 'lyn-float-slow' : 'lyn-float', className)}>{children}</div>;
}
