import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageBanner } from '@/components/layout/PageBanner';
import { Magnetic, Reveal, Stagger } from '@/components/motion';
import { EventHallCard } from '@/components/services/EventHallCard';
import { ServiceSection } from '@/components/services/ServiceSection';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { eventHalls, services } from '@/content/services';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'services' });
  return { title: t('title'), description: t('intro') };
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'services' });
  const tn = await getTranslations({ locale, namespace: 'nav' });

  return (
    <>
      <PageBanner eyebrow={t('eyebrow')} title={t('title')} image={services[0].images[0]} />

      <section className="bg-sand-50 pt-[var(--spacing-section)]">
        <Container>
          <Reveal blur>
            <p className="font-display text-2xl leading-relaxed text-ink-800 sm:text-3xl">
              {t('intro')}
            </p>
          </Reveal>
        </Container>
      </section>

      {services.map((service, index) => (
        <ServiceSection
          key={service.slug}
          service={service}
          reversed={index % 2 === 1}
          tone={index % 2 === 1 ? 'dark' : 'light'}
        />
      ))}

      <section className="bg-sand-100 py-[var(--spacing-section)]">
        <Container size="wide">
          <Reveal>
            <h2 className="rule-gold font-display text-4xl text-ink-900">{t('halls')}</h2>
          </Reveal>

          <Stagger className="mt-14 grid gap-10 md:grid-cols-3">
            {eventHalls.map((hall) => (
              <EventHallCard key={hall.slug} hall={hall} />
            ))}
          </Stagger>

          <Reveal className="mt-16 text-center">
            <Magnetic>
              <Button href="/contact" variant="outline">
                {tn('contact')}
              </Button>
            </Magnetic>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
