/**
 * Hotel facts.
 *
 * Every value below is projected from `hotel.config.json` at the repository
 * root — see `src/config/index.ts`. This module keeps the shape the pages
 * already consume (`hotel.tagline`, `contact.phones`, `img()`, `telHref()`), so
 * nothing downstream changed when the property did: edit the JSON, not this file.
 *
 * Swapping to the Django API later is still a one-line change per page.
 */

import { hotelConfig } from '@/config';

export type Localized = { fr: string; ar: string };

export const IMAGE_HOST = '';

/** Sand-on-ink, so placeholders read as part of the palette rather than as errors. */
const PLACEHOLDER_ORIGIN = 'https://placehold.co';
const PLACEHOLDER_SIZE = '1600x1067';
const PLACEHOLDER_COLOURS = '2b2118/d8c9a6';

/**
 * Photography lives in /public/images. Every `<Image>` on the site resolves its
 * `src` through here, which makes this the one place that decides where a photo
 * comes from — the public folder, a placeholder, or the Django media host later.
 *
 * While `media.usePlaceholders` is true the real paths are still what the
 * content files declare; only the resolved URL changes. Drop the official
 * photography at those paths (docs/image-manifest.md lists all 24) and flip the
 * flag — no content edits needed.
 */
export function img(path: string): string {
  if (hotelConfig.media.usePlaceholders) {
    const label = path
      .split('/')
      .pop()!
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/-/g, '+');
    return `${PLACEHOLDER_ORIGIN}/${PLACEHOLDER_SIZE}/${PLACEHOLDER_COLOURS}?text=${label}`;
  }
  return `${IMAGE_HOST}${path}`;
}

export const hotel = {
  name: hotelConfig.brand.name,
  nameAr: hotelConfig.brand.nameAr,
  shortName: hotelConfig.brand.shortName,
  stars: hotelConfig.brand.stars,
  chain: hotelConfig.brand.chain satisfies Localized,

  tagline: hotelConfig.tagline satisfies Localized,
  intro: hotelConfig.intro satisfies Localized,
  about: hotelConfig.about satisfies Localized,
  aboutRooms: hotelConfig.aboutRooms satisfies Localized,
  aboutDining: hotelConfig.aboutDining satisfies Localized,
  aboutEvents: hotelConfig.aboutEvents satisfies Localized,
  aboutWellness: hotelConfig.aboutWellness satisfies Localized,

  address: hotelConfig.address,
  coordinates: hotelConfig.coordinates,
  googleMapsUrl: hotelConfig.googleMapsUrl,

  /** Landmarks and travel times published by the hotel. */
  proximity: hotelConfig.proximity,

  /** Capacity figures, also used by the About page stat band. */
  capacity: hotelConfig.capacity,
  stats: hotelConfig.stats,

  media: hotelConfig.media,
} as const;

export const contact = {
  email: hotelConfig.contact.email,
  phones: hotelConfig.contact.phones,
  mobile: hotelConfig.contact.mobile,
  fax: hotelConfig.contact.fax,
  facebook: hotelConfig.contact.facebook,
  instagram: hotelConfig.contact.instagram,
  openingHours: hotelConfig.contact.openingHours satisfies Localized,
} as const;

/** Strips spaces so the value is usable in a tel: href. */
export function telHref(value: string): string {
  return `tel:${value.replace(/\s/g, '')}`;
}
