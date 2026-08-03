'use client';

import { useId, useState } from 'react';
import Image from 'next/image';

import { Stagger, TiltCard } from '@/components/motion';

export type ExperienceItem = {
  slug: string;
  name: string;
  kicker: string;
  description: string;
  image: string;
};

export type ExperienceGroup = {
  slug: string;
  label: string;
  items: ExperienceItem[];
};

/**
 * Filtered experience showcase.
 *
 * Panels crossfade rather than swap: the outgoing panel is never unmounted
 * mid-transition, so the section height stays stable and nothing below it
 * jumps. Only the active panel is in the tab order — the rest are `hidden`,
 * which removes them from both the a11y tree and keyboard navigation.
 */
export function ExperienceTabs({ groups }: { groups: ExperienceGroup[] }) {
  const [active, setActive] = useState(groups[0]?.slug ?? '');
  const baseId = useId();

  return (
    <div>
      <div role="tablist" aria-label="Catégories" className="lyn-tablist">
        {groups.map((group) => {
          const selected = group.slug === active;
          return (
            <button
              key={group.slug}
              type="button"
              role="tab"
              id={`${baseId}-tab-${group.slug}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${group.slug}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(group.slug)}
              className="lyn-tab"
              data-selected={selected ? '' : undefined}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      <div className="mt-12">
        {groups.map((group) => {
          const selected = group.slug === active;
          return (
            <div
              key={group.slug}
              role="tabpanel"
              id={`${baseId}-panel-${group.slug}`}
              aria-labelledby={`${baseId}-tab-${group.slug}`}
              hidden={!selected}
              className="lyn-panel"
              data-selected={selected ? '' : undefined}
            >
              {/* Keyed on the active tab so switching filters replays the
                  cascade rather than swapping the cards in place. */}
              <Stagger
                key={active}
                className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
              >
                {group.items.map((item) => (
                  <TiltCard key={item.slug} className="lyn-exp lyn-glow-edge group" max={4}>
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
                        className="lyn-img object-cover"
                      />
                      <span aria-hidden="true" className="lyn-img-veil" />
                    </div>

                    <div className="p-7">
                      <p className="text-[0.625rem] tracking-[0.28em] text-gold-700 uppercase">
                        {item.kicker}
                      </p>
                      <h3 className="mt-3 font-display text-2xl text-ink-900">{item.name}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-ink-500">
                        {item.description}
                      </p>
                    </div>
                  </TiltCard>
                ))}
              </Stagger>
            </div>
          );
        })}
      </div>
    </div>
  );
}
