import Image from 'next/image';
import { useLocale } from 'next-intl';

import { AmbientField, CurtainImage, Float, Reveal } from '@/components/motion';
import { Container } from '@/components/ui/Container';
import { img } from '@/content/hotel';
import type { ServiceContent } from '@/content/services';
import type { Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils/cn';

type Props = { service: ServiceContent; reversed?: boolean; tone?: 'light' | 'dark' };

/**
 * One service, alternating side to side down the page.
 *
 * The main photograph is uncovered by a gold curtain; the inset one follows a
 * beat later and drifts on its own slow cycle, so the pair never reads as a
 * single flat block. Copy reveals from the opposite side of the same beat.
 *
 * The dark variant gets an ambient pool — on `bg-ink-950` the section would
 * otherwise be a flat black band between two sand ones.
 */
export function ServiceSection({ service, reversed = false, tone = 'light' }: Props) {
  const locale = useLocale() as Locale;
  const dark = tone === 'dark';

  return (
    <section
      id={service.slug}
      className={cn(
        'relative scroll-mt-28 overflow-hidden py-[var(--spacing-section)]',
        dark ? 'bg-ink-950' : 'bg-sand-50',
      )}
    >
      <AmbientField className={dark ? 'lyn-ambient-warm' : 'lyn-ambient-soft'} />

      <Container size="wide">
        <div className="relative z-10 grid items-center gap-14 lg:grid-cols-2">
          <div className={cn('relative', reversed && 'lg:order-2')}>
            <CurtainImage className="aspect-4/3">
              <Image
                src={img(service.images[0])}
                alt={service.name[locale]}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </CurtainImage>

            {service.images[1] ? (
              <Float
                slow
                className={cn(
                  'absolute -bottom-8 hidden w-40 shadow-[var(--shadow-lift)] lg:block',
                  reversed ? 'ltr:-left-8 rtl:-right-8' : 'ltr:-right-8 rtl:-left-8',
                )}
              >
                <CurtainImage className="aspect-square" delay={0.18}>
                  <Image
                    src={img(service.images[1])}
                    alt=""
                    fill
                    sizes="10rem"
                    className="object-cover"
                  />
                </CurtainImage>
              </Float>
            ) : null}
          </div>

          <Reveal blur delay={0.12}>
            <p className="eyebrow">{service.kicker[locale]}</p>
            <h2
              className={cn(
                'rule-gold mt-4 font-display text-4xl sm:text-5xl',
                dark ? 'text-sand-50' : 'text-ink-900',
              )}
            >
              {service.name[locale]}
            </h2>
            <p className={cn('mt-8 leading-relaxed', dark ? 'text-sand-300/80' : 'text-ink-500')}>
              {service.description[locale]}
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
