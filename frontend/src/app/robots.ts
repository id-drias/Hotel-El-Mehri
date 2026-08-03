import type { MetadataRoute } from 'next';

import { site } from '@/lib/constants/site';

/* Same single source as the sitemap - see the note there. */
const BASE = site.url;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
