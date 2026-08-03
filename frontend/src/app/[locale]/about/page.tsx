import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageBanner } from '@/components/layout/PageBanner';
import { AmbientField, CurtainImage, Reveal, Stagger, StaggerItem } from '@/components/motion';
import { LocationMap } from '@/components/sections/LocationMap';
import { Container } from '@/components/ui/Container';
import { hotel, img } from '@/content/hotel';
import { isLocale, type Locale } from '@/lib/i18n/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return { title: t('title') };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'about' });
  const l = (isLocale(locale) ? locale : 'fr') as Locale;

  const chapters = [
    { title: t('roomsTitle'), body: hotel.aboutRooms[l], image: hotel.media.aboutImages[1] },
    { title: t('diningTitle'), body: hotel.aboutDining[l], image: hotel.media.aboutImages[2] },
    { title: t('eventsTitle'), body: hotel.aboutEvents[l], image: hotel.media.aboutImages[0] },
  ];

  return (
    <>
      <PageBanner eyebrow={t('eyebrow')} title={t('title')} image={hotel.media.aboutBanner} />

      <section className="bg-sand-50 py-[var(--spacing-section)]">
        <Container>
          <Reveal blur>
            <p className="font-display text-2xl leading-relaxed text-ink-800 sm:text-3xl">
              {hotel.about[l]}
            </p>
            <p className="mt-8 leading-relaxed text-ink-500">{hotel.aboutWellness[l]}</p>
          </Reveal>
        </Container>
      </section>

      <section className="relative overflow-hidden bg-sand-100 py-[var(--spacing-section)]">
        <AmbientField className="lyn-ambient-soft" />
        <Container size="wide" className="relative z-10">
          <Reveal>
            <p className="eyebrow rule-gold rule-gold-center text-center">{t('figuresEyebrow')}</p>
          </Reveal>
          <Stagger as="div" className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {hotel.stats.map((stat) => (
              // A <dl> cannot take an arbitrary element between it and its
              // pairs, so the stagger sits on a plain grid of small lists —
              // each figure keeps its own term/description association.
              <StaggerItem key={stat.value}>
                <dl className="border-t border-ink-800/10 pt-6 text-center">
                  <dt className="font-display text-4xl text-gold-600">{stat.value}</dt>
                  <dd className="mt-2 text-[0.6875rem] tracking-[0.18em] text-ink-400 uppercase">
                    {stat.label[l]}
                  </dd>
                </dl>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </section>

      <section className="bg-sand-50 py-[var(--spacing-section)]">
        <Container size="wide">
          <div className="space-y-24">
            {chapters.map((chapter, index) => (
              <div
                key={chapter.title}
                className={`grid items-center gap-14 lg:grid-cols-2 ${
                  index % 2 === 1 ? 'lg:[&>figure]:order-2' : ''
                }`}
              >
                <figure className="m-0">
                  <CurtainImage className="aspect-4/3">
                    <Image
                      src={img(chapter.image)}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 45vw, 100vw"
                      className="object-cover"
                    />
                  </CurtainImage>
                </figure>
                <Reveal blur delay={0.12}>
                  <h2 className="rule-gold font-display text-3xl text-ink-900 sm:text-4xl">
                    {chapter.title}
                  </h2>
                  <p className="mt-8 leading-relaxed text-ink-500">{chapter.body}</p>
                </Reveal>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <LocationMap />
    </>
  );
}
