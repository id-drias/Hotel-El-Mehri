'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { youtubeEmbedId } from '@/lib/utils/youtube';

export function RoomVideo({ videoUrl, title }: { videoUrl: string; title: string }) {
  const t = useTranslations('home');
  const [playing, setPlaying] = useState(false);

  const videoId = youtubeEmbedId(videoUrl);
  if (!videoId) return null;

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-ink-900">
      {playing ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={title}
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
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="img-zoom object-cover"
            unoptimized
          />
          <span className="absolute inset-0 bg-ink-950/35 transition-colors duration-700 group-hover:bg-ink-950/20" />
          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 transition-all duration-500 group-hover:border-gold-400">
            <svg viewBox="0 0 24 24" className="ml-1 h-5 w-5 fill-white" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
