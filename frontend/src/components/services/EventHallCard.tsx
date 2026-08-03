import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { StaggerItem } from '@/components/motion';
import { img } from '@/content/hotel';
import type { EventHallContent } from '@/content/services';
import type { Locale } from '@/lib/i18n/config';

export function EventHallCard({ hall }: { hall: EventHallContent }) {
  const t = useTranslations('services');
  const locale = useLocale() as Locale;

  return (
    <StaggerItem as="article" className="group">
      <div className="lyn-figure relative aspect-4/3">
        <Image
          src={img(hall.image)}
          alt={hall.name[locale]}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="lyn-img object-cover"
        />
        <span aria-hidden="true" className="lyn-img-veil" />
      </div>
      <h3 className="mt-6 font-display text-2xl text-ink-900">{hall.name[locale]}</h3>
      {hall.capacity ? (
        <p className="mt-2 text-[0.625rem] uppercase tracking-[0.22em] text-gold-600">
          {hall.capacity} {t('capacity')}
        </p>
      ) : null}
      <p className="mt-3 text-sm leading-relaxed text-ink-500">{hall.description[locale]}</p>
    </StaggerItem>
  );
}
