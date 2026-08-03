'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { motion, type Variants } from 'framer-motion';

import { GalleryFilters, type FilterOption } from './GalleryFilters';
import { Lightbox } from './Lightbox';
import { EASE_LUXE } from '@/components/motion';
import { img } from '@/content/hotel';

export type GalleryGroup = { slug: string; label: string; images: string[] };

type Props = { groups: GalleryGroup[]; allLabel: string };

/* A gallery can run to dozens of images, so the per-tile step is small and
   capped: without the ceiling the fortieth photograph would wait two seconds
   for its turn, which stops reading as choreography and starts reading as a
   slow page. */
const tileVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE_LUXE, delay: Math.min(index * 0.04, 0.5) },
  }),
};

export function GalleryGrid({ groups, allLabel }: Props) {
  const [active, setActive] = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const options: FilterOption[] = [
    { slug: 'all', label: allLabel },
    ...groups.map((group) => ({ slug: group.slug, label: group.label })),
  ];

  const images = useMemo(() => {
    if (active === 'all') return groups.flatMap((group) => group.images);
    return groups.find((group) => group.slug === active)?.images ?? [];
  }, [active, groups]);

  return (
    <div>
      <GalleryFilters
        options={options}
        active={active}
        onChange={(slug) => {
          setActive(slug);
          setLightboxIndex(null);
        }}
      />

      {/* Keyed on the active filter so switching category replays the cascade
          rather than swapping images in place.

          The stagger is declared per tile, not on the wrapper: this is a CSS
          multi-column layout, and a `<Stagger>` element around the tiles would
          become the single column-flow child, collapsing the masonry into one
          column. `custom` carries each tile's index into its own delay, which
          gets the same cascade without touching the layout.

          These animate on mount rather than on view. The filter is at the top
          of the section, so choosing a category always puts the reader at the
          start of the results — and a per-tile IntersectionObserver across a
          gallery this size buys nothing but bookkeeping. */}
      <div key={active} className="mt-16 columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
        {images.map((src, index) => (
          <motion.button
            key={`${active}-${src}`}
            type="button"
            onClick={() => setLightboxIndex(index)}
            data-motion
            custom={index}
            variants={tileVariants}
            initial="hidden"
            animate="shown"
            className="lyn-tile lyn-focus group"
          >
            <Image
              src={img(src)}
              alt=""
              width={600}
              height={index % 3 === 0 ? 800 : 450}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="lyn-img h-auto w-full object-cover"
            />
            <span aria-hidden="true" className="lyn-tile-veil" />
          </motion.button>
        ))}
      </div>

      {lightboxIndex !== null ? (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      ) : null}
    </div>
  );
}
