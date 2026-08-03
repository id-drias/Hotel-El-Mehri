import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { Container } from '@/components/ui/Container';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { img } from '@/content/hotel';
import { services } from '@/content/services';
import type { Locale } from '@/lib/i18n/config';

export function DiningSection() {
  const t = useTranslations('home');
  const locale = useLocale() as Locale;
  const dining = services.filter(
    (service) => service.category === 'restaurant' || service.category === 'tea_room',
  );

  return (
    <section className="bg-sand-100 py-[var(--spacing-section)]">
      <Container size="wide">
        <SectionTitle
          eyebrow={t('diningEyebrow')}
          title={t('diningTitle')}
          description={t('diningIntro')}
          align="center"
        />

        <div className="mt-16 grid gap-10 lg:grid-cols-3">
          {dining.map((service) => (
            <article key={service.slug} className="group">
              <div className="relative aspect-3/2 overflow-hidden">
                <Image
                  src={img(service.images[0])}
                  alt={service.name[locale]}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="img-zoom object-cover"
                />
              </div>
              <p className="eyebrow mt-7">{service.kicker[locale]}</p>
              <h3 className="mt-3 font-display text-3xl text-ink-900">{service.name[locale]}</h3>
              <p className="mt-4 text-sm leading-relaxed text-ink-500">
                {service.description[locale]}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
