'use client';

import { useState } from 'react';
import Image from 'next/image';

import { img } from '@/content/hotel';
import { cn } from '@/lib/utils/cn';

export function RoomGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="relative aspect-16/10 overflow-hidden bg-ink-800">
        <Image
          key={images[active]}
          src={img(images[active])}
          alt={alt}
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="animate-fade-up object-cover"
        />
      </div>

      {images.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`${alt} — ${index + 1}`}
              aria-current={index === active}
              className={cn(
                'relative aspect-square overflow-hidden transition-opacity duration-500',
                index === active ? 'opacity-100' : 'opacity-45 hover:opacity-80',
              )}
            >
              <Image src={img(src)} alt="" fill sizes="12vw" className="object-cover" />
              {index === active ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gold-500" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
