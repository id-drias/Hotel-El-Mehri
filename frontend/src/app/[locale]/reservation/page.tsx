import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageBanner } from '@/components/layout/PageBanner';
import { AmbientField, Reveal } from '@/components/motion';
import { ReservationForm } from '@/components/reservation/ReservationForm';
import { Container } from '@/components/ui/Container';
import { ContactBlock } from '@/components/layout/ContactBlock';
import { rooms } from '@/content/rooms';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'reservation' });
  return { title: t('title'), description: t('intro') };
}

export default async function ReservationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'reservation' });

  return (
    <>
      <PageBanner eyebrow={t('eyebrow')} title={t('title')} image={rooms[rooms.length - 1].images[0]} />

      <section className="relative overflow-hidden bg-sand-50 py-[var(--spacing-section)]">
        <AmbientField className="lyn-ambient-soft" />

        <Container size="wide" className="relative z-10">
          <div className="grid gap-20 lg:grid-cols-[1.6fr_1fr]">
            <Reveal blur>
              <p className="max-w-xl font-display text-2xl leading-relaxed text-ink-800">
                {t('intro')}
              </p>
              <div className="mt-16">
                <ReservationForm />
              </div>
            </Reveal>

            <Reveal delay={0.14} as="div">
              <aside className="lg:border-l lg:border-ink-800/10 lg:ltr:pl-16 lg:rtl:pr-16">
                <ContactBlock />
              </aside>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
