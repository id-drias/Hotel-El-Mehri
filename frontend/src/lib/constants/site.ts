import { hotelConfig } from '@/config';

export const site = {
  name: hotelConfig.brand.name,
  stars: hotelConfig.brand.stars,
  city: hotelConfig.address.city,
  country: 'DZ',
  coordinates: hotelConfig.coordinates,
  url: process.env.NEXT_PUBLIC_SITE_URL ?? hotelConfig.seo.siteUrl,
} as const;
