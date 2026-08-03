import Image from 'next/image';

import { AmbientField, Parallax, Reveal, WordReveal } from '@/components/motion';
import { img } from '@/content/hotel';

type Props = {
  eyebrow: string;
  title: string;
  image: string;
};

/**
 * The dark banner every inner page opens with, so the header stays legible.
 *
 * This is the homepage hero's treatment at a smaller scale — parallaxed
 * photograph, breathing ambient light, title rising word by word out of a mask.
 * Seven pages open with it, so it is the single place where consistency across
 * the site is won or lost.
 *
 * The eyebrow now reveals on view rather than through the `animate-fade-up`
 * utility: that CSS animation fires on load whether or not the element is on
 * screen, which is right for a hero and wrong for anything a visitor can arrive
 * at mid-scroll from a back navigation.
 */
export function PageBanner({ eyebrow, title, image }: Props) {
  return (
    <section className="lyn-banner">
      {/* Overscanned and drifting. Decorative, hence `alt=""` — the heading
          sitting on top of it already says what the page is. */}
      <Parallax className="lyn-media-layer" distance={70}>
        <Image src={img(image)} alt="" fill priority sizes="100vw" className="object-cover" />
      </Parallax>

      <span aria-hidden="true" className="lyn-banner-scrim" />
      <AmbientField />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 sm:px-8">
        <Reveal>
          <p className="eyebrow rule-gold text-gold-300">{eyebrow}</p>
        </Reveal>

        <WordReveal
          text={title}
          delay={0.2}
          className="mt-6 font-display text-5xl text-white sm:text-6xl lg:text-7xl"
        />
      </div>
    </section>
  );
}
