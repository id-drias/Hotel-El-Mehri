/**
 * The room categories.
 *
 * The three categories and their rates are transcribed from the hotel's own
 * 2026 tariff posters: Chambre, Suite Junior and Suite Senior, each priced for
 * single and double occupancy. The full board matrix (room only, half board,
 * full board, and the 15% summer discount) lives in `rates.board` in
 * hotel.config.json; `fromRate` here is the room-only single-occupancy rate,
 * which is what the cards advertise as "à partir de".
 *
 * Surfaces are not published by the hotel, so no category claims one.
 */

import { hotelConfig } from '@/config';
import type { Localized } from './hotel';

export type RoomContent = {
  slug: string;
  name: Localized;
  description: Localized;
  maxAdults: number;
  /** The hotel publishes no surfaces; null everywhere, mirroring `types/room.ts`. */
  surfaceM2: number | null;
  /** Room-only, single occupancy, per night in DZD. From `rates.board`. */
  fromRate: number;
  specifications: Localized[];
  images: string[];
  /** Full URL, mirroring Django's `Room.video_url`. */
  videoUrl?: string;
};

const board = hotelConfig.rates.board;

/** Every category includes these — from the tariff poster's inclusions panel. */
const COMMON: Localized[] = [
  { fr: 'Wifi haut débit', ar: 'واي فاي عالي السرعة' },
  { fr: 'Climatisation', ar: 'تكييف' },
  { fr: 'Petit déjeuner inclus', ar: 'الفطور مشمول' },
  { fr: 'Salle de bain privative', ar: 'حمام خاص' },
  { fr: 'Parking gratuit et sécurisé', ar: 'موقف مجاني ومؤمَّن' },
  { fr: 'Accès piscine', ar: 'دخول المسبح' },
];

export const rooms: RoomContent[] = [
  {
    slug: 'chambre',
    name: { fr: 'Chambre', ar: 'غرفة' },
    description: {
      fr: "La catégorie principale de l'hôtel, en occupation simple ou double : lit matrimonial ou lits jumeaux, décor sobre et lumineux, salle de bain privative et vue sur la ville ou sur le jardin.",
      ar: 'الفئة الرئيسية في الفندق، بإشغال فردي أو مزدوج: سرير مزدوج أو سريران منفصلان، بديكور هادئ ومضيء، مع حمام خاص وإطلالة على المدينة أو على الحديقة.',
    },
    maxAdults: 2,
    surfaceM2: null,
    fromRate: board.chambre.single.standard,
    specifications: [
      { fr: 'Lit double ou lits jumeaux', ar: 'سرير مزدوج أو سريران منفصلان' },
      ...COMMON,
      { fr: 'Télévision', ar: 'تلفاز' },
    ],
    images: ['/images/rooms/chambre-1.jpg', '/images/rooms/chambre-2.jpg'],
  },
  {
    slug: 'suite-junior',
    name: { fr: 'Suite Junior', ar: 'جناح صغير' },
    description: {
      fr: 'Une chambre prolongée par un espace salon, pour les séjours qui demandent un peu plus de place — missions longues, familles, escales prolongées.',
      ar: 'غرفة نوم يمتد إليها ركن صالون، للإقامات التي تتطلب مساحة إضافية — المهام الطويلة والعائلات والإقامات الممتدة.',
    },
    maxAdults: 2,
    surfaceM2: null,
    fromRate: board['suite-junior'].single.standard,
    specifications: [
      { fr: 'Une chambre à coucher', ar: 'غرفة نوم' },
      { fr: 'Espace salon', ar: 'ركن صالون' },
      ...COMMON,
      { fr: 'Télévision', ar: 'تلفاز' },
    ],
    images: ['/images/rooms/suite-junior-1.jpg', '/images/rooms/suite-junior-2.jpg'],
  },
  {
    slug: 'suite-senior',
    name: { fr: 'Suite Senior', ar: 'جناح كبير' },
    description: {
      fr: "Le plus grand hébergement de la maison : chambre et salon séparés, pour recevoir autant que pour séjourner.",
      ar: 'أوسع أماكن الإقامة في الفندق: غرفة نوم وصالون منفصلان، للاستقبال والإقامة معاً.',
    },
    maxAdults: 3,
    surfaceM2: null,
    fromRate: board['suite-senior'].single.standard,
    specifications: [
      { fr: 'Une chambre à coucher', ar: 'غرفة نوم' },
      { fr: 'Salon séparé', ar: 'صالون منفصل' },
      ...COMMON,
      { fr: 'Télévision', ar: 'تلفاز' },
    ],
    images: ['/images/rooms/suite-senior-1.jpg', '/images/rooms/suite-senior-2.jpg'],
  },
];

export function getRoom(slug: string): RoomContent | undefined {
  return rooms.find((room) => room.slug === slug);
}
