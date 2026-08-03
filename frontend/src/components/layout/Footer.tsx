import { useLocale, useTranslations } from 'next-intl';

import { ContactBlock } from './ContactBlock';
import { SocialLinks } from './SocialLinks';
import { AmbientField, Reveal, Stagger, StaggerItem } from '@/components/motion';
import { Container } from '@/components/ui/Container';
import { wordmark } from '@/config';
import { rooms } from '@/content/rooms';
import { services } from '@/content/services';
import { hotel } from '@/content/hotel';
import type { Locale } from '@/lib/i18n/config';
import { Link } from '@/lib/i18n/navigation';

/**
 * Still a server component. The motion primitives are the only client code that
 * reaches this file, and they take their children as a slot — so the wordmark,
 * the two link columns and the contact block are all rendered on the server and
 * handed to the animation wrapper already built.
 *
 * The four columns cascade in as a group rather than each revealing on its own
 * trigger: they sit on one line at desktop width, and four independent
 * observers firing microseconds apart looks like a stutter, not a stagger.
 */
export function Footer() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const year = new Date().getFullYear();

  return (
    <footer className="lyn relative overflow-hidden bg-ink-950 pt-24 pb-10 text-sand-200">
      {/* One slow pool of warmth low in the frame, so the page doesn't simply
          stop at a flat black rectangle. */}
      <AmbientField className="lyn-ambient-warm" />

      <Container size="wide">
        <div className="relative z-10">
          <Stagger className="grid gap-14 md:grid-cols-2 lg:grid-cols-4">
            <StaggerItem>
              <p className="font-display keep-tracking text-2xl tracking-[0.18em] text-white">
                {wordmark.primary}
              </p>
              <p className="keep-tracking mt-1 text-[0.5625rem] tracking-[0.5em] text-gold-500">
                {wordmark.secondary}
              </p>
              <p className="mt-8 max-w-xs text-sm leading-relaxed text-sand-300/70">
                {hotel.tagline[locale]}
              </p>
              <SocialLinks tone="light" className="mt-8" />
            </StaggerItem>

            <StaggerItem>
              <h2 className="text-[0.625rem] tracking-[0.22em] text-gold-500 uppercase">
                {t('nav.rooms')}
              </h2>
              <nav className="mt-6 flex flex-col gap-3 text-sm">
                {rooms.map((room) => (
                  <Link
                    key={room.slug}
                    href={`/rooms/${room.slug}`}
                    className="lyn-foot-link text-sand-200/80 transition-colors duration-500 hover:text-gold-300"
                  >
                    {room.name[locale]}
                  </Link>
                ))}
              </nav>
            </StaggerItem>

            <StaggerItem>
              <h2 className="text-[0.625rem] tracking-[0.22em] text-gold-500 uppercase">
                {t('nav.services')}
              </h2>
              <nav className="mt-6 flex flex-col gap-3 text-sm">
                {services.map((service) => (
                  <Link
                    key={service.slug}
                    href={`/services#${service.slug}`}
                    className="lyn-foot-link text-sand-200/80 transition-colors duration-500 hover:text-gold-300"
                  >
                    {service.name[locale]}
                  </Link>
                ))}
              </nav>
            </StaggerItem>

            <StaggerItem>
              <ContactBlock tone="light" />
            </StaggerItem>
          </Stagger>

          <Reveal className="mt-20 flex flex-col gap-4 border-t border-white/10 pt-8 text-[0.6875rem] tracking-[0.12em] text-sand-300/50 sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {year} {hotel.name}. {t('footer.rights')}
            </p>
            <Link href="/contact" className="uppercase transition-colors hover:text-gold-300">
              {t('footer.contactUs')}
            </Link>
          </Reveal>
        </div>
      </Container>
    </footer>
  );
}
