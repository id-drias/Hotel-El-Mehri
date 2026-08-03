'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { img } from '@/content/hotel';

type Props = {
  images: string[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export function Lightbox({ images, index, onClose, onNavigate }: Props) {
  const t = useTranslations('gallery');

  const previous = () => onNavigate((index - 1 + images.length) % images.length);
  const next = () => onNavigate((index + 1) % images.length);

  useEffect(() => {
    const rtl = document.documentElement.dir === 'rtl';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      // In RTL the gallery advances leftwards, so the arrow keys swap with it.
      if (event.key === 'ArrowRight') (rtl ? previous : next)();
      if (event.key === 'ArrowLeft') (rtl ? next : previous)();
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  });

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/97 p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t('close')}
        className="absolute end-6 top-6 flex h-11 w-11 cursor-pointer items-center justify-center text-4xl leading-none font-extralight text-white/70 transition-colors hover:text-white"
      >
        &times;
      </button>

      {/* Logical start/end keeps "previous" on the leading edge in both
          directions. The chevrons need no rtl: rotation — U+2039/U+203A are
          bidi-mirrored glyphs, so the browser already flips them under RTL;
          rotating as well would turn them back inwards. */}
      <button
        type="button"
        onClick={previous}
        aria-label={t('previous')}
        className="absolute start-4 z-10 flex h-12 w-12 cursor-pointer items-center justify-center text-3xl text-white/60 transition-colors hover:text-gold-300 sm:start-10"
      >
        &#8249;
      </button>

      <div className="relative h-[78vh] w-full max-w-5xl">
        <Image
          key={images[index]}
          src={img(images[index])}
          alt=""
          fill
          sizes="90vw"
          className="animate-fade-up object-contain"
        />
      </div>

      <button
        type="button"
        onClick={next}
        aria-label={t('next')}
        className="absolute end-4 z-10 flex h-12 w-12 cursor-pointer items-center justify-center text-3xl text-white/60 transition-colors hover:text-gold-300 sm:end-10"
      >
        &#8250;
      </button>

      <p className="absolute bottom-7 text-[0.6875rem] tracking-[0.22em] text-white/50">
        {t('counter', { current: index + 1, total: images.length })}
      </p>
    </div>
  );
}
