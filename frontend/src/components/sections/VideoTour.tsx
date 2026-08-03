'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { hotel } from '@/content/hotel';
import { youtubeEmbedId } from '@/lib/utils/youtube';

/**
 * Facade pattern: the YouTube iframe only loads once the visitor asks for it,
 * so the embed never costs anything on first paint.
 */
export function VideoTour() {
  const t = useTranslations('home');
  const [playing, setPlaying] = useState(false);
  const videoId = youtubeEmbedId(hotel.media.tourVideoUrl);
  if (!videoId) return null;

  return (
    <section className="bg-ink-950 py-[var(--spacing-section)]">
      <div className="mx-auto w-full max-w-6xl px-6 sm:px-8">
        <div className="mb-14 text-center">
          <p className="eyebrow">{t('videoEyebrow')}</p>
          <h2 className="rule-gold rule-gold-center mt-4 font-display text-4xl text-sand-50 sm:text-5xl">
            {t('videoTitle')}
          </h2>
        </div>

        <div className="relative aspect-video w-full overflow-hidden shadow-[var(--shadow-lift)]">
          {playing ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title={t('videoTitle')}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="group relative h-full w-full"
              aria-label={t('videoPlay')}
            >
              <Image
                src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
                alt=""
                fill
                sizes="(min-width: 1024px) 72rem, 100vw"
                className="img-zoom object-cover"
                unoptimized
              />
              <span className="absolute inset-0 bg-ink-950/35 transition-colors duration-700 group-hover:bg-ink-950/20" />
              <span className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 backdrop-blur-sm transition-all duration-500 group-hover:border-gold-400 group-hover:bg-gold-500/20">
                <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-white" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
