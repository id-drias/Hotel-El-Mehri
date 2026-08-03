import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { TiltCard } from '@/components/motion';
import { img } from '@/content/hotel';
import type { RoomContent } from '@/content/rooms';
import type { Locale } from '@/lib/i18n/config';
import { Link } from '@/lib/i18n/navigation';

/**
 * A room tile: tilts toward the cursor, with a warm glow tracking the pointer
 * and a gold light travelling its border.
 *
 * `TiltCard` carries the `staggerChild` variant, so dropping these into a
 * `<Stagger>` is all it takes to make a grid cascade.
 *
 * The "view" label reveals on `:focus-within` as well as `:hover`. It was
 * hover-only, which meant a keyboard user tabbing through the grid got no
 * confirmation of where they were — and on touch it never appeared at all.
 */
export function RoomCard({ room, priority = false }: { room: RoomContent; priority?: boolean }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;

  return (
    <TiltCard as="div" max={4} className="lyn-glow-edge group overflow-hidden rounded-[2px]">
      <Link href={`/rooms/${room.slug}`} className="lyn-focus block">
        <div className="relative aspect-4/5 overflow-hidden bg-ink-800">
          <Image
            src={img(room.images[0])}
            alt={room.name[locale]}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="lyn-img object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/10 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-7">
            <h3 className="font-display text-2xl text-white">{room.name[locale]}</h3>
            <p className="mt-2 text-[0.6875rem] tracking-[0.18em] text-sand-300/80 uppercase">
              {room.surfaceM2} m² &middot; {room.maxAdults} {t('common.guests')}
            </p>
            <span className="mt-5 inline-block text-[0.6875rem] tracking-[0.22em] text-gold-300 uppercase opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100">
              {t('rooms.view')}
            </span>
          </div>
        </div>
      </Link>
    </TiltCard>
  );
}
