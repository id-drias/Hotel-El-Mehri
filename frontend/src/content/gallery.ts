/** Every published photograph, grouped by the gallery filter tabs. */

import type { Localized } from './hotel';

export type GalleryCategory = {
  slug: string;
  label: Localized;
  images: string[];
};

export const galleryCategories: GalleryCategory[] = [
  {
    slug: 'rooms',
    label: { fr: 'Chambres et suites', ar: 'الغرف والأجنحة' },
    images: [
      '/images/rooms/chambre-double-1.jpg',
      '/images/rooms/chambre-double-2.jpg',
      '/images/rooms/chambre-double-3.jpg',
      '/images/rooms/chambre-double-4.jpg',
      '/images/rooms/suite-1.jpg',
      '/images/rooms/suite-2.jpg',
      '/images/rooms/suite-3.jpg',
    ],
  },
  {
    slug: 'dining',
    label: { fr: 'Restauration', ar: 'المطاعم' },
    images: [
      '/images/dining/restaurant-1.jpg',
      '/images/dining/restaurant-2.jpg',
      '/images/dining/restaurant-3.jpg',
      '/images/dining/restaurant-4.jpg',
      '/images/dining/cafeteria-1.jpg',
      '/images/dining/cafeteria-2.jpg',
      '/images/dining/kheima-1.jpg',
      '/images/dining/kheima-2.jpg',
    ],
  },
  {
    slug: 'wellness',
    label: { fr: 'Loisirs et bien-être', ar: 'الترفيه والاستجمام' },
    images: [
      '/images/wellness/piscine-1.jpg',
      '/images/wellness/piscine-2.jpg',
      '/images/wellness/piscine-3.jpg',
      '/images/wellness/sauna-1.jpg',
      '/images/wellness/sauna-2.jpg',
    ],
  },
  {
    slug: 'events',
    label: { fr: 'Événementiel', ar: 'المناسبات' },
    images: [
      '/images/events/salle-conference-1.jpg',
      '/images/events/salle-conference-2.jpg',
      '/images/events/salle-conference-3.jpg',
    ],
  },
  {
    slug: 'hotel',
    label: { fr: "L'hôtel", ar: 'الفندق' },
    images: [
      '/images/hotel/hotel-1.jpg',
      '/images/hotel/hotel-2.jpg',
      '/images/hotel/hotel-3.jpg',
    ],
  },
];

export const allGalleryImages: string[] = galleryCategories.flatMap((c) => c.images);
