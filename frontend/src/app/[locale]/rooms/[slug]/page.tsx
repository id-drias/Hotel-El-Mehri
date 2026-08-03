import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AmbientField, Magnetic, Reveal, Stagger } from '@/components/motion';
import { RoomCard } from '@/components/rooms/RoomCard';
import { RoomGallery } from '@/components/rooms/RoomGallery';
import { RoomSpecs } from '@/components/rooms/RoomSpecs';
import { RoomVideo } from '@/components/rooms/RoomVideo';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { getRoom, rooms } from '@/content/rooms';
import { isLocale, locales, type Locale } from '@/lib/i18n/config';
import { Link } from '@/lib/i18n/navigation';
import { formatRate } from '@/lib/utils/format';

export function generateStaticParams() {
  return locales.flatMap((locale) => rooms.map((room) => ({ locale, slug: room.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const room = getRoom(slug);
  if (!room) return {};
  const l = (isLocale(locale) ? locale : 'fr') as Locale;
  return { title: room.name[l], description: room.description[l] };
}

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const room = getRoom(slug);
  if (!room) notFound();

  const t = await getTranslations({ locale, namespace: 'rooms' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const l = (isLocale(locale) ? locale : 'fr') as Locale;
  const others = rooms.filter((item) => item.slug !== room.slug);

  return (
    <>
      <section className="bg-sand-50 pt-36 pb-[var(--spacing-section)]">
        <Container size="wide">
          <Link
            href="/rooms"
            className="text-[0.625rem] uppercase tracking-[0.22em] text-ink-400 transition-colors hover:text-gold-600"
          >
            &larr; {tc('backToRooms')}
          </Link>

          <div className="mt-10 grid gap-14 lg:grid-cols-[1.4fr_1fr]">
            <Reveal>
              <RoomGallery images={room.images} alt={room.name[l]} />
            </Reveal>

            {/* This page has no banner, so the detail column carries the
                entrance. It follows the gallery rather than leading it — the
                photograph is what the visitor clicked through for. */}
            <Reveal blur delay={0.14} className="lg:pt-4">
              <p className="eyebrow">{t('eyebrow')}</p>
              <h1 className="rule-gold mt-4 font-display text-4xl text-ink-900 sm:text-5xl">
                {room.name[l]}
              </h1>

              <p className="mt-8 leading-relaxed text-ink-500">{room.description[l]}</p>

              <div className="mt-8 flex gap-10 border-y border-ink-800/10 py-6">
                {room.surfaceM2 ? (
                  <div>
                    <p className="font-display text-3xl text-gold-600">{room.surfaceM2} m&sup2;</p>
                    <p className="mt-1 text-[0.625rem] uppercase tracking-[0.18em] text-ink-400">
                      {tc('surface')}
                    </p>
                  </div>
                ) : null}
                <div>
                  <p className="font-display text-3xl text-gold-600">
                    {formatRate(room.fromRate, l)}
                  </p>
                  <p className="mt-1 text-[0.625rem] uppercase tracking-[0.18em] text-ink-400">
                    {tc('fromPerNight')}
                  </p>
                </div>
                <div>
                  <p className="font-display text-3xl text-gold-600">{room.maxAdults}</p>
                  <p className="mt-1 text-[0.625rem] uppercase tracking-[0.18em] text-ink-400">
                    {tc('guests')}
                  </p>
                </div>
              </div>

              <h2 className="mt-10 text-[0.625rem] uppercase tracking-[0.22em] text-gold-600">
                {t('amenities')}
              </h2>
              <div className="mt-5">
                <RoomSpecs items={room.specifications.map((spec) => spec[l])} />
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-6">
                <Magnetic>
                  <Button href="/reservation">{t('book')}</Button>
                </Magnetic>
                <span className="text-sm text-ink-400">{tc('priceOnRequest')}</span>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {room.videoUrl ? (
        <section className="relative overflow-hidden bg-ink-950 py-[var(--spacing-section)]">
          <AmbientField className="lyn-ambient-warm" />
          <Container size="wide" className="relative z-10">
            <Reveal>
              <p className="eyebrow text-center">{t('video')}</p>
              <h2 className="rule-gold rule-gold-center mt-4 text-center font-display text-4xl text-sand-50">
                {room.name[l]}
              </h2>
            </Reveal>
            <Reveal className="mt-14" delay={0.1}>
              <RoomVideo videoUrl={room.videoUrl} title={room.name[l]} />
            </Reveal>
          </Container>
        </section>
      ) : null}

      <section className="bg-sand-100 py-[var(--spacing-section)]">
        <Container size="wide">
          <Reveal>
            <h2 className="rule-gold font-display text-3xl text-ink-900">{t('otherRooms')}</h2>
          </Reveal>
          <Stagger className="mt-14 grid gap-6 sm:grid-cols-3">
            {others.map((item) => (
              <RoomCard key={item.slug} room={item} />
            ))}
          </Stagger>
        </Container>
      </section>
    </>
  );
}
