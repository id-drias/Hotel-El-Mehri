import type { MetadataRoute } from 'next';

import { articles } from '@/content/articles';
import { rooms } from '@/content/rooms';
import { locales } from '@/lib/i18n/config';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

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
