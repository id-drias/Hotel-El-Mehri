import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ContactForm } from '@/components/contact/ContactForm';
import { ContactInfo } from '@/components/contact/ContactInfo';
import { MapEmbed } from '@/components/contact/MapEmbed';
import { PageBanner } from '@/components/layout/PageBanner';
import { AmbientField, Reveal } from '@/components/motion';
import { Container } from '@/components/ui/Container';
import { hotel } from '@/content/hotel';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return { title: t('title'), description: t('intro') };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'contact' });

  return (
    <>
      <PageBanner eyebrow={t('eyebrow')} title={t('title')} image={hotel.media.aboutImages[2]} />

      <section className="relative overflow-hidden bg-sand-50 py-[var(--spacing-section)]">
        <AmbientField className="lyn-ambient-soft" />

        <Container size="wide" className="relative z-10">
          <div className="grid gap-20 lg:grid-cols-[1fr_1.3fr]">
            <Reveal blur>
              <p className="font-display text-2xl leading-relaxed text-ink-800">{t('intro')}</p>
              <div className="mt-12">
                <ContactInfo />
              </div>
            </Reveal>

            {/* The form arrives a beat after the details beside it, so the eye
                lands on who you are writing to before what you have to fill in. */}
            <Reveal delay={0.14}>
              <h2 className="rule-gold font-display text-3xl text-ink-900">{t('formTitle')}</h2>
              <div className="mt-12">
                <ContactForm />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <MapEmbed className="h-[28rem]" />
    </>
  );
}
