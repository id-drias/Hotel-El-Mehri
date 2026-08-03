'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { hotel } from '@/content/hotel';

const { lat, lng } = hotel.coordinates;

/** Loads the Google Maps iframe only on interaction — it is a heavy third party. */
export function MapEmbed({ className }: { className?: string }) {
  const t = useTranslations('contact');
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={className}>
      {loaded ? (
        <iframe
          title={t('mapTitle')}
          src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full min-h-80 w-full border-0"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="group flex h-full min-h-80 w-full flex-col items-center justify-center gap-4 bg-ink-900 text-sand-200 transition-colors duration-500 hover:bg-ink-800"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8 fill-gold-500" aria-hidden="true">
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5" />
          </svg>
          <span className="text-[0.6875rem] uppercase tracking-[0.22em]">{t('mapTitle')}</span>
        </button>
      )}
    </div>
  );
}
