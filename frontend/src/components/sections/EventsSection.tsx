import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { Container } from '@/components/ui/Container';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { img } from '@/content/hotel';
import { eventHalls, services } from '@/content/services';
import type { Locale } from '@/lib/i18n/config';

export function EventsSection() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const events = services.find((service) => service.category === 'events');

  return (
    <section className="bg-sand-50 py-[var(--spacing-section)]">
      <Container size="wide">
        <SectionTitle
          eyebrow={t('home.eventsEyebrow')}
          title={t('home.eventsTitle')}
          description={events?.description[locale]}
        />

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {eventHalls.map((hall) => (
            <article key={hall.slug} className="group relative overflow-hidden">
              <div className="relative aspect-4/3">
                <Image
                  src={img(hall.image)}
                  alt={hall.name[locale]}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="img-zoom object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-7">
                <h3 className="font-display text-2xl text-white">{hall.name[locale]}</h3>
                {hall.capacity ? (
                  <p className="mt-2 text-[0.6875rem] uppercase tracking-[0.2em] text-gold-300">
                    {hall.capacity} {t('services.capacity')}
                  </p>
                ) : null}
                <p className="mt-3 text-sm text-sand-200/80">{hall.description[locale]}</p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
