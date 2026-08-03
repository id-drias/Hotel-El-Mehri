/**
 * The room categories.
 *
 * Grounded in the post-rehabilitation figures the hotel and the Algerian press
 * published: 81 rooms for 180 beds, of which 78 are doubles. The suite count is
 * derived (81 − 78) rather than published — see `_needsConfirmation` in
 * hotel.config.json before treating it as final.
 *
 * No rates here on purpose: the property has no current public price grid, so
 * the UI renders "Tarif sur demande" exactly as the reference build did. Add a
 * `fromRate` per room and flip `rates.showPrices` in the config once confirmed.
 */

import type { Localized } from './hotel';

export type RoomContent = {
  slug: string;
  name: Localized;
  description: Localized;
  surfaceM2: number;
  maxAdults: number;
  specifications: Localized[];
  images: string[];
  /** Full URL, mirroring Django's `Room.video_url`. */
  videoUrl?: string;
};

export const rooms: RoomContent[] = [
  {
    slug: 'chambre-double',
    name: { fr: 'Chambre Double', ar: 'غرفة مزدوجة' },
    description: {
      fr: "La catégorie principale de l'hôtel : 78 chambres doubles rénovées, en lit matrimonial ou deux lits séparés, avec salle de bain privative et vue sur la ville ou sur le jardin.",
      ar: 'الفئة الرئيسية في الفندق: 78 غرفة مزدوجة مجدَّدة، بسرير مزدوج أو سريرين منفصلين، مع حمام خاص وإطلالة على المدينة أو على الحديقة.',
    },
    surfaceM2: 24,
    maxAdults: 2,
    specifications: [
      { fr: 'Wifi', ar: 'ويفي' },
      { fr: 'Climatisation', ar: 'تكييف' },
      { fr: 'Télévision', ar: 'تلفاز' },
      { fr: 'Salle de bain privative', ar: 'حمام خاص' },
      { fr: 'Téléphone', ar: 'هاتف' },
      { fr: 'Lit double ou lits jumeaux', ar: 'سرير مزدوج أو سريران منفصلان' },
    ],
    images: [
      '/images/rooms/chambre-double-1.jpg',
      '/images/rooms/chambre-double-2.jpg',
      '/images/rooms/chambre-double-3.jpg',
      '/images/rooms/chambre-double-4.jpg',
    ],
  },
  {
    slug: 'suite',
    name: { fr: 'Suite', ar: 'جناح' },
    description: {
      fr: "Les plus grands hébergements de la maison : une chambre prolongée par un salon, pour les séjours d'affaires longs et les réceptions privées.",
      ar: 'أوسع أماكن الإقامة في الفندق: غرفة نوم يمتد إليها صالون، للإقامات المهنية الطويلة والاستقبالات الخاصة.',
    },
    surfaceM2: 45,
    maxAdults: 3,
    specifications: [
      { fr: 'Wifi', ar: 'ويفي' },
      { fr: 'Climatisation', ar: 'تكييف' },
      { fr: 'Une chambre à coucher', ar: 'غرفة نوم' },
      { fr: 'Un salon', ar: 'صالون' },
      { fr: 'Télévision', ar: 'تلفاز' },
      { fr: 'Salle de bain privative', ar: 'حمام خاص' },
    ],
    images: [
      '/images/rooms/suite-1.jpg',
      '/images/rooms/suite-2.jpg',
      '/images/rooms/suite-3.jpg',
    ],
  },
];

export function getRoom(slug: string): RoomContent | undefined {
  return rooms.find((room) => room.slug === slug);
}
