import type { Metadata } from 'next';
import { Amiri, Cormorant_Garamond, IBM_Plex_Sans_Arabic, Jost } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { MotionStage } from '@/components/motion';
import { hotel } from '@/content/hotel';
import { getDirection, isLocale, locales, type Locale } from '@/lib/i18n/config';
import '@/styles/globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-cormorant',
  display: 'swap',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500'],
  variable: '--font-jost',
  display: 'swap',
});

/**
 * Cormorant and Jost carry no Arabic glyphs, so the `ar` locale needs its own
 * pair: Amiri is a naskh face with the same editorial weight as Cormorant, and
 * IBM Plex Sans Arabic answers Jost for body copy. Only the pair belonging to
 * the active locale is attached to <html>, so a French visitor never downloads
 * the Arabic faces and vice versa.
 */
const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-amiri',
  display: 'swap',
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['200', '300', '400', '500'],
  variable: '--font-plex-arabic',
  display: 'swap',
});

const fontsByLocale: Record<Locale, string> = {
  fr: `${cormorant.variable} ${jost.variable}`,
  ar: `${amiri.variable} ${plexArabic.variable}`,
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  const typedLocale = isLocale(locale) ? locale : 'fr';

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: { default: `${hotel.name} — ${t('heroStars')}`, template: `%s | ${hotel.name}` },
    description: hotel.about[typedLocale],
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      type: 'website',
      siteName: hotel.name,
      title: hotel.name,
      description: hotel.about[typedLocale],
      locale: typedLocale === 'ar' ? 'ar_DZ' : 'fr_DZ',
    },
  };
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} dir={getDirection(locale)} className={fontsByLocale[locale]}>
      <head>
        {/* Framer Motion serialises its `initial` styles into the SSR markup, so
            `opacity: 0` ships in the HTML. Without this a visitor with scripts
            off — or a crawler that doesn't execute them — would be served a
            blank header, a blank footer and a blank homepage. `noscript` styles
            apply only when scripts are off, so animated visitors are untouched. */}
        <noscript
          dangerouslySetInnerHTML={{
            /* Descendants too: a masked word or a staggered child is a motion
               element in its own right, parked off-screen by a transform its
               tagged ancestor knows nothing about. The curtain is hidden rather
               than reset, because its resting transform *is* the covered state —
               neutralising it would leave the photograph behind a gold panel. */
            __html:
              '<style>[data-motion],[data-motion] *{opacity:1!important;transform:none!important}' +
              '.lyn-curtain-veil{display:none!important}</style>',
          }}
        />
      </head>
      <body>
        {/* One MotionConfig for the whole document. `reducedMotion="user"` makes
            Framer drop transform and layout animation for visitors who ask for
            it, keeping only opacity — applied internally after hydration, so
            the served markup is identical either way. */}
        <MotionStage>
          <NextIntlClientProvider>
            <Header />
            <main>{children}</main>
            <Footer />
          </NextIntlClientProvider>
        </MotionStage>
      </body>
    </html>
  );
}
