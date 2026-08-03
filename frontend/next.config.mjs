import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Stand-in photography while `media.usePlaceholders` is true in
      // hotel.config.json. Safe to drop once the official photos are in place.
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      // Django media, once the API is live.
      { protocol: 'http', hostname: '127.0.0.1', port: '8000', pathname: '/media/**' },
      { protocol: 'https', hostname: 'api.hotelelmehri.dz', pathname: '/media/**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

export default withNextIntl(nextConfig);
