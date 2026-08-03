import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { hotel, img } from '@/content/hotel';
import type { Locale } from '@/lib/i18n/config';

export function WelcomeSection() {
  const t = useTranslations('home');
  const locale = useLocale() as Locale;

  return (
    <section className="bg-sand-50 py-[var(--spacing-section)]">
      <Container size="wide">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="relative">
            <div className="relative aspect-4/5 overflow-hidden">
              <Image
                src={img(hotel.media.aboutImages[0])}
                alt=""
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-10 hidden aspect-square w-48 overflow-hidden shadow-[var(--shadow-lift)] ltr:-right-10 rtl:-left-10 lg:block">
              <Image
                src={img(hotel.media.aboutImages[1])}
                alt=""
                fill
                sizes="12rem"
                className="object-cover"
              />
            </div>
          </div>

          <div>
            <p className="eyebrow">{t('aboutEyebrow')}</p>
            <h2 className="rule-gold mt-4 font-display text-4xl text-ink-900 sm:text-5xl">
              {t('aboutTitle')}
            </h2>
            <p className="mt-8 leading-relaxed text-ink-500">{hotel.about[locale]}</p>
            <p className="mt-5 leading-relaxed text-ink-500">{hotel.aboutRooms[locale]}</p>

            <dl className="mt-12 grid grid-cols-2 gap-8 border-t border-ink-800/10 pt-10">
              {hotel.stats.slice(0, 4).map((stat) => (
                <div key={stat.value}>
                  <dt className="font-display text-3xl text-gold-600">{stat.value}</dt>
                  <dd className="mt-1 text-[0.6875rem] uppercase tracking-[0.18em] text-ink-400">
                    {stat.label[locale]}
                  </dd>
                </div>
              ))}
            </dl>

            <Button href="/about" variant="outline" className="mt-12">
              {t('heroCta')}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
