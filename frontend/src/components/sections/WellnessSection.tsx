import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { Container } from '@/components/ui/Container';
import { img } from '@/content/hotel';
import { services } from '@/content/services';
import type { Locale } from '@/lib/i18n/config';

export function WellnessSection() {
  const t = useTranslations('home');
  const locale = useLocale() as Locale;
  const spa = services.find((service) => service.category === 'wellness');
  if (!spa) return null;

  return (
    <section className="bg-ink-950 py-[var(--spacing-section)] text-sand-100">
      <Container size="wide">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="eyebrow">{t('wellnessEyebrow')}</p>
            <h2 className="rule-gold mt-4 font-display text-4xl text-sand-50 sm:text-5xl">
              {t('wellnessTitle')}
            </h2>
            <p className="mt-8 leading-relaxed text-sand-300/80">{spa.description[locale]}</p>

            <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 text-sm text-sand-200/70">
              {[
                'Hammam à vapeur',
                'Piscine couverte',
                'Piscine semi-olympique',
                'Salle de fitness',
                'Deux cabines de massage',
                'Salon de coiffure',
              ].map((item) => (
                <span key={item} className="flex items-center gap-3">
                  <span className="h-px w-4 shrink-0 bg-gold-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative aspect-3/4 overflow-hidden">
              <Image
                src={img(spa.images[0])}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="relative mt-12 aspect-3/4 overflow-hidden">
              <Image
                src={img(spa.images[1] ?? spa.images[0])}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
