import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageBanner } from '@/components/layout/PageBanner';
import { Magnetic, Reveal } from '@/components/motion';
import { RoomGrid } from '@/components/rooms/RoomGrid';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { rooms } from '@/content/rooms';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'rooms' });
  return { title: t('title'), description: t('intro') };
}

export default async function RoomsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'rooms' });

  return (
    <>
      <PageBanner eyebrow={t('eyebrow')} title={t('title')} image={rooms[rooms.length - 1].images[0]} />

      <section className="bg-sand-50 py-[var(--spacing-section)]">
        <Container size="wide">
          <Reveal blur>
            <p className="max-w-2xl font-display text-2xl leading-relaxed text-ink-800">
              {t('intro')}
            </p>
          </Reveal>

          <div className="mt-16">
            <RoomGrid rooms={rooms} />
          </div>

          <Reveal className="mt-20 border-t border-ink-800/10 pt-14 text-center">
            <Magnetic>
              <Button href="/reservation">{t('book')}</Button>
            </Magnetic>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
