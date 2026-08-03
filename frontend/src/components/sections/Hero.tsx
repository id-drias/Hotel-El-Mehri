import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Rating } from '@/components/ui/Rating';
import { hotel, img } from '@/content/hotel';
import type { Locale } from '@/lib/i18n/config';

export function Hero() {
  const t = useTranslations('home');
  const locale = useLocale() as Locale;

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <Image
        src={img(hotel.media.heroBanner)}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-ink-950/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-ink-950/40" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 pt-24 text-center">
        <div className="animate-fade-up flex flex-col items-center">
          {/* Decorative: the same wording is rendered as visible text below. */}
          <Rating value={hotel.stars} className="mb-6" />
          <p className="text-[0.6875rem] uppercase tracking-[0.35em] text-gold-300">
            {t('heroStars')}
          </p>
        </div>

        <h1
          className="animate-fade-up mt-8 font-display text-6xl leading-[0.95] text-white sm:text-7xl lg:text-8xl"
          style={{ animationDelay: '120ms' }}
        >
          {hotel.name}
        </h1>

        <p
          className="animate-fade-up mx-auto mt-8 max-w-xl text-sand-200/90"
          style={{ animationDelay: '240ms' }}
        >
          {hotel.intro[locale]}
        </p>

        <div className="animate-fade-up mt-12" style={{ animationDelay: '360ms' }}>
          <Button href="/about" variant="light">
            {t('heroCta')}
          </Button>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2">
        <span className="sr-only">{t('heroScroll')}</span>
        <span className="block h-14 w-px bg-gradient-to-b from-transparent via-gold-400/70 to-transparent" />
      </div>
    </section>
  );
}
