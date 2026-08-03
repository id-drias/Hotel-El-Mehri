/**
 * The hotel's facilities, as a flat list for the homepage grid.
 *
 * Every entry is lifted from copy the hotel already publishes — the Facebook
 * intro ("chambre, suite, piscine, restaurant, cafétéria"), the rehabilitation
 * reporting (sauna, kheima, garden, two conference rooms) and the directory
 * listings (wifi, parking). The Arabic mirrors `hotel.aboutWellness` and
 * `hotel.aboutDining` in ./hotel.ts, so the two locales stay in step.
 *
 * Nothing is added that the hotel does not claim. If a facility is not named in
 * the sources above, it does not belong in this file.
 */

import type { Localized } from './hotel';

/** Keys into the icon set in `components/concepts/AmenityGrid.tsx`. */
export type AmenityIcon =
  | 'wifi'
  | 'pool-outdoor'
  | 'hammam'
  | 'restaurant'
  | 'cafe'
  | 'conference'
  | 'garden'
  | 'parking';

export type Amenity = {
  slug: string;
  icon: AmenityIcon;
  label: Localized;
};

export const amenities: Amenity[] = [
  {
    slug: 'wifi',
    icon: 'wifi',
    label: { fr: 'Wifi', ar: 'ويفي' },
  },
  {
    slug: 'piscine',
    icon: 'pool-outdoor',
    label: { fr: 'Piscine extérieure', ar: 'مسبح خارجي' },
  },
  {
    slug: 'sauna',
    icon: 'hammam',
    label: { fr: 'Sauna', ar: 'ساونا' },
  },
  {
    slug: 'restaurant',
    icon: 'restaurant',
    label: { fr: 'Restaurant gastronomique', ar: 'مطعم راقٍ' },
  },
  {
    slug: 'cafeteria',
    icon: 'cafe',
    label: { fr: 'Cafétéria', ar: 'كافيتيريا' },
  },
  {
    slug: 'salles-conference',
    icon: 'conference',
    label: { fr: 'Salles de conférence', ar: 'قاعات مؤتمرات' },
  },
  {
    slug: 'jardin-kheima',
    icon: 'garden',
    label: { fr: 'Jardin et kheima', ar: 'حديقة وخيمة' },
  },
  {
    slug: 'parking',
    icon: 'parking',
    label: { fr: 'Parking', ar: 'موقف سيارات' },
  },
];
