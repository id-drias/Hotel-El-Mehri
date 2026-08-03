'use client';

import Image from 'next/image';
import { useLocale } from 'next-intl';

import { img } from '@/content/hotel';
import { rooms } from '@/content/rooms';
import type { Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils/cn';

type Props = {
  selected: Record<string, number>;
  onChange: (slug: string, quantity: number) => void;
};

export function RoomSelector({ selected, onChange }: Props) {
  const locale = useLocale() as Locale;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rooms.map((room) => {
        const quantity = selected[room.slug] ?? 0;
        const active = quantity > 0;

        return (
          <div
            key={room.slug}
            className={cn(
              'flex items-center gap-4 border p-4 transition-colors duration-500',
              active ? 'border-gold-500 bg-sand-100' : 'border-ink-800/15',
            )}
          >
            <div className="relative h-20 w-24 shrink-0 overflow-hidden">
              <Image
                src={img(room.images[0])}
                alt=""
                fill
                sizes="6rem"
                className="object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg text-ink-900">{room.name[locale]}</p>
              <p className="text-[0.625rem] uppercase tracking-[0.18em] text-ink-400">
                {room.surfaceM2} m&sup2;
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange(room.slug, Math.max(0, quantity - 1))}
                disabled={quantity === 0}
                aria-label={`${room.name[locale]} -`}
                className="flex h-7 w-7 items-center justify-center border border-ink-800/20 text-ink-500 transition-colors hover:border-gold-500 disabled:opacity-30"
              >
                &minus;
              </button>
              <span className="w-4 text-center text-sm text-ink-900">{quantity}</span>
              <button
                type="button"
                onClick={() => onChange(room.slug, quantity + 1)}
                aria-label={`${room.name[locale]} +`}
                className="flex h-7 w-7 items-center justify-center border border-ink-800/20 text-ink-500 transition-colors hover:border-gold-500"
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
