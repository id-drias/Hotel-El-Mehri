import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { allGalleryImages } from '@/content/gallery';
import { img } from '@/content/hotel';

export function GalleryPreview() {
  const t = useTranslations('home');
  const preview = [
    allGalleryImages[0],
    allGalleryImages[17],
    allGalleryImages[26],
    allGalleryImages[32],
    allGalleryImages[11],
    allGalleryImages[38],
  ].filter(Boolean);

  return (
    <section className="bg-sand-100 py-[var(--spacing-section)]">
      <Container size="wide">
        <SectionTitle eyebrow={t('galleryEyebrow')} title={t('galleryTitle')} align="center" />

        <div className="mt-16 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {preview.map((src, index) => (
            <div key={src} className="group relative aspect-square overflow-hidden">
              <Image
                src={img(src)}
                alt=""
                fill
                sizes="(min-width: 1024px) 16vw, 33vw"
                className="img-zoom object-cover"
                loading={index < 3 ? undefined : 'lazy'}
              />
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Button href="/gallery" variant="outline">
            {t('galleryCta')}
          </Button>
        </div>
      </Container>
    </section>
  );
}
