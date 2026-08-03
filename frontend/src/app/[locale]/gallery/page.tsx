import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { PageBanner } from '@/components/layout/PageBanner';
import { AmbientField } from '@/components/motion';
import { Container } from '@/components/ui/Container';
import { galleryCategories } from '@/content/gallery';
import { hotel } from '@/content/hotel';
import { isLocale, type Locale } from '@/lib/i18n/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'gallery' });
  return { title: t('title') };
}

export default async function GalleryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'gallery' });
  const l = (isLocale(locale) ? locale : 'fr') as Locale;

  const groups = galleryCategories.map((category) => ({
    slug: category.slug,
    label: category.label[l],
    images: category.images,
  }));

  return (
    <>
      <PageBanner eyebrow={t('eyebrow')} title={t('title')} image={hotel.media.heroBanner} />

      <section className="relative overflow-hidden bg-sand-50 py-[var(--spacing-section)]">
        <AmbientField className="lyn-ambient-soft" />
        <Container size="wide" className="relative z-10">
          {/* No Reveal wrapper here: GalleryGrid staggers its own tiles, and a
              parent fading the whole grid in would run against that. */}
          <GalleryGrid groups={groups} allLabel={t('all')} />
        </Container>
      </section>
    </>
  );
}
