import { useLocale, useTranslations } from 'next-intl';

import { MapEmbed } from '@/components/contact/MapEmbed';
import { AmbientField, Reveal } from '@/components/motion';
import { Container } from '@/components/ui/Container';
import { hotel } from '@/content/hotel';
import type { Locale } from '@/lib/i18n/config';

export function LocationMap() {
  const t = useTranslations();
  const locale = useLocale() as Locale;

  return (
    <section className="bg-sand-100 py-[var(--spacing-section)]">
      <Container size="wide">
        <Reveal className="grid items-stretch gap-0 lg:grid-cols-2">
          <div className="relative flex flex-col justify-center overflow-hidden bg-ink-950 p-12 text-sand-100 lg:p-16">
            <AmbientField className="lyn-ambient-warm" />
            <div className="relative z-10">
              <p className="eyebrow">{t('home.locationEyebrow')}</p>
              <h2 className="rule-gold mt-4 font-display text-4xl text-sand-50">
                {t('home.locationTitle')}
              </h2>
              <p className="mt-8 leading-relaxed text-sand-300/80">{hotel.intro[locale]}</p>

              <address className="mt-8 not-italic text-sand-100">
                {hotel.address.street}
                <br />
                {hotel.address.postalCode} {hotel.address.city}, {hotel.address.country[locale]}
              </address>

              <a
                href={hotel.googleMapsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-8 inline-block self-start text-[0.6875rem] tracking-[0.22em] text-gold-400 uppercase transition-colors duration-500 hover:text-gold-300"
              >
                {t('contact.openInMaps')}
              </a>
            </div>
          </div>

          <MapEmbed className="min-h-96" />
        </Reveal>
      </Container>
    </section>
  );
}
