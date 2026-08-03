import type { MetadataRoute } from 'next';

import { articles } from '@/content/articles';
import { rooms } from '@/content/rooms';
import { site } from '@/lib/constants/site';
import { locales } from '@/lib/i18n/config';

/* `site.url` is NEXT_PUBLIC_SITE_URL when set, otherwise seo.siteUrl from
   hotel.config.json. Hardcoding a localhost fallback here shipped
   http://localhost:3000 into the production sitemap. */
const BASE = site.url;

const staticPaths = ['', '/about', '/rooms', '/services', '/gallery', '/blog', '/contact', '/reservation'];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...staticPaths,
    ...rooms.map((room) => `/rooms/${room.slug}`),
    ...articles.map((article) => `/blog/${article.slug}`),
  ];

  return locales.flatMap((locale) =>
    paths.map((path) => ({
      url: `${BASE}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
      priority: path === '' ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${BASE}/${l}${path}`])),
      },
    })),
  );
}
