/**
 * Every published photograph, grouped by the gallery filter tabs.
 *
 * Real photography only. Slots still awaiting a photo (see `media.pendingPhotos`
 * in hotel.config.json) are deliberately absent: a placeholder is a reasonable
 * stand-in on a room card, where the surrounding copy carries the meaning, but a
 * gallery is nothing but its images. Add the tab back once its photos exist —
 * `events` is missing for exactly that reason.
 */

import type { Localized } from './hotel';

export type GalleryCategory = {
  slug: string;
  label: Localized;
  images: string[];
};

export const galleryCategories: GalleryCategory[] = [
  {
    slug: 'hotel',
    label: { fr: "L'hôtel", ar: 'الفندق' },
    images: [
      '/images/hotel/hotel-1.jpg',
      '/images/hotel/hotel-2.jpg',
      '/images/hotel/hotel-3.jpg',
      '/images/banners/about.jpg',
    ],
  },
  {
    slug: 'rooms',
    label: { fr: 'Chambres et suites', ar: 'الغرف والأجنحة' },
    images: ['/images/rooms/chambre-1.jpg', '/images/rooms/chambre-2.jpg'],
  },
  {
    slug: 'dining',
    label: { fr: 'Restauration', ar: 'المطاعم' },
    images: [
      '/images/dining/restaurant-1.jpg',
      '/images/dining/cafeteria-1.jpg',
      '/images/dining/cafeteria-2.jpg',
      '/images/dining/cafeteria-3.jpg',
      '/images/dining/cafeteria-4.jpg',
      '/images/dining/cafeteria-5.jpg',
    ],
  },
  {
    slug: 'wellness',
    label: { fr: 'Loisirs et bien-être', ar: 'الترفيه والاستجمام' },
    images: ['/images/wellness/piscine-1.jpg', '/images/banners/hero.jpg'],
  },
];

export const allGalleryImages: string[] = galleryCategories.flatMap((c) => c.images);
