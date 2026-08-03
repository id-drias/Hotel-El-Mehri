import Image from 'next/image';

import { AmenityGrid } from './AmenityGrid';
import { ExperienceTabs, type ExperienceGroup } from './ExperienceTabs';
import { GuestVoices } from './GuestVoices';
import {
  AmbientField,
  CurtainImage,
  Float,
  Magnetic,
  Parallax,
  Reveal,
  Stagger,
  StaggerItem,
  TiltCard,
  WordReveal,
} from '@/components/motion';
import { starsLabel } from '@/config';
import { contact, hotel, img, telHref } from '@/content/hotel';
import { rooms } from '@/content/rooms';
import { services } from '@/content/services';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/config';
import type { Review } from '@/types/review';

/**
 * Animated homepage on the Hôtel El Mehri brand.
 *
 * Everything visible here comes from `src/content/*` — the hotel's own copy,
 * photography, rooms, facilities and contact details. Nothing is invented:
 * there are no prices (the content has none), no awards, and no testimonials
 * until the reviews endpoint returns some, because fabricating those for a
 * trading business is a liability, not a design choice.
 *
 * Motion is Framer Motion (see `src/components/motion`) on the same expo-out
 * curve as `--ease-luxe` in tokens.css, with the CSS half in
 * `src/styles/motion.css`. Every primitive collapses under
 * `prefers-reduced-motion`, and the layout's `<noscript>` guard keeps the page
 * readable when scripts don't run.
 *
 * The one restraint worth naming: the design skill rates "animate everything"
 * an anti-pattern in its own right. What keeps this the right side of that line
 * is that each section has exactly one entrance and each element exactly one
 * job — the ambient loops are slow and low-contrast, the tilt and glow are
 * decoration over content that is already legible and already linked, and no
 * effect ever gates access to anything.
 */

/** The handful of UI strings that aren't in the content files. */
const UI = {
  reserve: { fr: 'Réserver', ar: 'احجز' },
  /* Derived from `brand.stars` in hotel.config.json — see `starsLabel()`. */
  scroll: { fr: 'Faire défiler', ar: 'مرّر للأسفل' },
  arrival: { fr: 'Arrivée', ar: 'تاريخ الوصول' },
  departure: { fr: 'Départ', ar: 'تاريخ المغادرة' },
  guests: { fr: 'Voyageurs', ar: 'المسافرون' },
  category: { fr: 'Catégorie', ar: 'الفئة' },
  anyCategory: { fr: 'Toutes catégories', ar: 'كل الفئات' },
  checkAvailability: { fr: 'Vérifier les disponibilités', ar: 'تحقق من التوفر' },
  roomsEyebrow: { fr: 'Hébergement', ar: 'الإقامة' },
  roomsTitle: { fr: 'Chambres et suites', ar: 'الغرف والأجنحة' },
  amenitiesEyebrow: { fr: 'Équipements', ar: 'التجهيزات' },
  amenitiesTitle: {
    fr: 'Tout ce que la maison met à votre disposition',
    ar: 'كل ما يضعه الفندق بين أيديكم',
  },
  expEyebrow: { fr: 'Expériences', ar: 'التجارب' },
  expTitle: { fr: 'Table, bien-être et réceptions', ar: 'المائدة والاستجمام والحفلات' },
  dining: { fr: 'Restauration', ar: 'المطاعم' },
  wellness: { fr: 'Bien-être', ar: 'الاستجمام' },
  events: { fr: 'Événementiel', ar: 'المناسبات' },
  aboutEyebrow: { fr: "L'hôtel", ar: 'الفندق' },
  discover: { fr: "Découvrir l'hôtel", ar: 'اكتشف الفندق' },
  ctaTitle: { fr: 'Votre séjour commence ici', ar: 'إقامتكم تبدأ من هنا' },
  ctaBody: {
    fr: 'Notre équipe commerciale vous répond du dimanche au jeudi, et vous accompagne du choix de la chambre à l’organisation de votre événement.',
    ar: 'يجيبكم فريقنا التجاري من الأحد إلى الخميس، ويرافقكم من اختيار الغرفة إلى تنظيم مناسبتكم.',
  },
  callUs: { fr: 'Nous appeler', ar: 'اتصلوا بنا' },
  upTo: { fr: "Jusqu'à", ar: 'حتى' },
  adults: { fr: 'personnes', ar: 'أشخاص' },
  onRequest: { fr: 'Tarif sur demande', ar: 'السعر عند الطلب' },
  seeRoom: { fr: 'Voir la chambre', ar: 'عرض الغرفة' },
} as const;

type Dict = { fr: string; ar: string };
const t = (d: Dict, l: Locale) => d[l];

export function ElMehriHome({ locale, reviews = [] }: { locale: Locale; reviews?: Review[] }) {
  const diningItems = services.filter(
    (s) => s.category === 'restaurant' || s.category === 'tea_room',
  );
  const wellnessItems = services.filter((s) => s.category === 'wellness');
  const eventItems = services.filter((s) => s.category === 'events');

  const toItems = (list: typeof services) =>
    list.map((s) => ({
      slug: s.slug,
      name: s.name[locale],
      kicker: s.kicker[locale],
      description: s.description[locale],
      image: img(s.images[0]),
    }));

  const groups: ExperienceGroup[] = [
    { slug: 'dining', label: t(UI.dining, locale), items: toItems(diningItems) },
    { slug: 'wellness', label: t(UI.wellness, locale), items: toItems(wellnessItems) },
    { slug: 'events', label: t(UI.events, locale), items: toItems(eventItems) },
  ];

  return (
    <div className="lyn bg-sand-50 text-ink-800">
      {/* No nav or footer here on purpose. The site's own <Header> already does
          what this concept's floating bar did — transparent over the hero, solid
          sand bar once scrolled — and it carries the language switcher and the
          focus-trapped MobileMenu. Duplicating it would mean two navs and a
          keyboard trap regression. Layout supplies both. */}

      {/* --------------------------------------------------------- hero -- */}
      <section className="lyn-hero">
        <div className="lyn-hero-media">
          {/* Only the photograph drifts. The copy and the booking bar sitting on
              top of it stay put: parallaxed body text is a motion-sickness
              trigger, and a control that slides as it is being tapped is worse
              than no effect at all. The layer is overscanned 8% so the travel
              never exposes an edge. */}
          <Parallax className="lyn-media-layer" distance={90}>
            <Image
              src={img(hotel.media.heroBanner)}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </Parallax>
          <span aria-hidden="true" className="lyn-hero-scrim" />
          <AmbientField />
        </div>

        <div className="lyn-hero-inner">
          <div className="flex flex-col items-center text-center">
            <p className="lyn-enter text-[0.6875rem] tracking-[0.34em] text-gold-300 uppercase">
              {starsLabel(locale)}
            </p>

            {/* Word by word out of a mask — never letter by letter. Arabic is a
                joined script and per-character splitting severs the shaping
                run; see the note on <WordReveal>. */}
            <WordReveal
              text={hotel.name}
              delay={0.25}
              className="mt-7 max-w-4xl font-display text-[clamp(2.75rem,8vw,6rem)] leading-[0.98] text-white"
            />

            <p className="lyn-enter-2 mt-6 font-display text-[clamp(1.125rem,2.6vw,1.75rem)] text-gold-300 italic">
              {hotel.tagline[locale]}
            </p>

            <p className="lyn-enter-3 mt-7 max-w-xl leading-relaxed text-sand-200/90">
              {hotel.intro[locale]}
            </p>
          </div>

          {/* Booking bar — labels stay visible; a placeholder-only field
              disappears the moment a value is entered. Each field lights a beam
              along its lower edge on `:focus-within`, so the keyboard gets the
              same cue as the pointer. */}
          <form className="lyn-enter-4 lyn-book" action="/reservation">
            <div className="lyn-book-grid">
              <label className="lyn-field">
                <span className="lyn-field-label">{t(UI.arrival, locale)}</span>
                <input type="date" name="checkin" className="lyn-input" />
              </label>

              <label className="lyn-field">
                <span className="lyn-field-label">{t(UI.departure, locale)}</span>
                <input type="date" name="checkout" className="lyn-input" />
              </label>

              <label className="lyn-field">
                <span className="lyn-field-label">{t(UI.guests, locale)}</span>
                <select name="guests" className="lyn-input lyn-select" defaultValue="2">
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} {t(UI.adults, locale)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="lyn-field">
                <span className="lyn-field-label">{t(UI.category, locale)}</span>
                <select name="room" className="lyn-input lyn-select" defaultValue="">
                  <option value="">{t(UI.anyCategory, locale)}</option>
                  {rooms.map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.name[locale]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="lyn-book-action">
                <Magnetic className="w-full" strength={4}>
                  <button type="submit" className="lyn-cta lyn-focus w-full justify-center">
                    <span>{t(UI.checkAvailability, locale)}</span>
                  </button>
                </Magnetic>
              </div>
            </div>
          </form>
        </div>

        <div className="lyn-scroll-cue">
          <span className="sr-only">{t(UI.scroll, locale)}</span>
          <span aria-hidden="true" className="lyn-scroll-rail">
            <span className="lyn-scroll-bead" />
          </span>
        </div>
      </section>

      {/* -------------------------------------------------------- stats -- */}
      <section className="border-b border-ink-800/10 bg-sand-100">
        <Stagger
          as="ul"
          className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-ink-800/10 lg:grid-cols-4"
        >
          {hotel.stats.map((stat) => (
            <StaggerItem as="li" key={stat.value} className="lyn-stat">
              <span className="block font-display text-3xl text-ink-900 sm:text-4xl">
                {stat.value}
              </span>
              <span className="mt-2 block text-[0.625rem] tracking-[0.26em] text-ink-500 uppercase">
                {stat.label[locale]}
              </span>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* -------------------------------------------------------- rooms -- */}
      <section className="px-4 py-[var(--spacing-section)] sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-2xl" blur>
            <p className="eyebrow rule-gold">{t(UI.roomsEyebrow, locale)}</p>
            <h2 className="mt-6 font-display text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.05] text-ink-900">
              {t(UI.roomsTitle, locale)}
            </h2>
            <p className="mt-5 leading-relaxed text-ink-500">{hotel.aboutRooms[locale]}</p>
          </Reveal>

          <Stagger className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room, i) => {
              const featured = i === 0;
              return (
                <TiltCard
                  key={room.slug}
                  /* Wide rather than tall: spanning two rows forces a fixed
                     card height the content can't fill, which reads as a bug. */
                  className={`lyn-room lyn-glow-edge group ${featured ? 'sm:col-span-2' : ''}`}
                >
                  {/* Always a definite aspect ratio. A `fill` image inside a
                      flex-derived height is measured at zero by the lazy loader
                      and never fetches at all. */}
                  <div
                    className={`relative overflow-hidden ${
                      featured ? 'aspect-[16/10] lg:aspect-[2/1]' : 'aspect-[4/3]'
                    }`}
                  >
                    <Image
                      src={img(room.images[0])}
                      alt=""
                      fill
                      sizes={
                        featured
                          ? '(min-width:1024px) 66vw, 100vw'
                          : '(min-width:1024px) 33vw, 50vw'
                      }
                      className="lyn-img object-cover"
                    />
                    <span aria-hidden="true" className="lyn-img-veil" />
                    <span className="lyn-room-badge">
                      {room.surfaceM2} m² · {t(UI.upTo, locale)} {room.maxAdults}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-7">
                    <h3
                      className={`font-display text-ink-900 ${featured ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}
                    >
                      {room.name[locale]}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink-500">
                      {room.description[locale]}
                    </p>

                    <ul className="mt-5 flex flex-wrap gap-2">
                      {room.specifications.slice(0, featured ? 5 : 3).map((spec) => (
                        <li key={spec.fr} className="lyn-chip">
                          {spec[locale]}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink-800/10 pt-5">
                      <span className="text-[0.6875rem] tracking-[0.2em] text-ink-500 uppercase">
                        {t(UI.onRequest, locale)}
                      </span>
                      <Link href={`/rooms/${room.slug}`} className="lyn-link lyn-focus">
                        {t(UI.seeRoom, locale)}
                      </Link>
                    </div>
                  </div>
                </TiltCard>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* ---------------------------------------------------- amenities -- */}
      <section className="relative overflow-hidden bg-sand-100 px-4 py-[var(--spacing-section)] sm:px-6">
        <AmbientField className="lyn-ambient-soft" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <Reveal className="max-w-2xl" blur>
            <p className="eyebrow rule-gold">{t(UI.amenitiesEyebrow, locale)}</p>
            <h2 className="mt-6 font-display text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.05] text-ink-900">
              {t(UI.amenitiesTitle, locale)}
            </h2>
            <p className="mt-5 leading-relaxed text-ink-500">{hotel.aboutWellness[locale]}</p>
          </Reveal>

          <div className="mt-14">
            <AmenityGrid locale={locale} />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- experiences -- */}
      <section className="px-4 py-[var(--spacing-section)] sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-2xl" blur>
            <p className="eyebrow rule-gold">{t(UI.expEyebrow, locale)}</p>
            <h2 className="mt-6 font-display text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.05] text-ink-900">
              {t(UI.expTitle, locale)}
            </h2>
          </Reveal>

          <Reveal className="mt-12">
            <ExperienceTabs groups={groups} />
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------- about -- */}
      <section className="bg-sand-100 px-4 py-[var(--spacing-section)] sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div className="relative">
            <Float>
              <CurtainImage className="aspect-[4/5]">
                <Image
                  src={img(hotel.media.aboutImages[0])}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 45vw, 100vw"
                  className="object-cover"
                />
              </CurtainImage>
            </Float>

            <Float
              className="absolute -bottom-10 hidden w-48 shadow-[var(--shadow-lift)] ltr:-end-10 rtl:-end-10 lg:block"
              slow
            >
              <CurtainImage className="aspect-square" delay={0.2}>
                <Image
                  src={img(hotel.media.aboutImages[1])}
                  alt=""
                  fill
                  sizes="12rem"
                  className="object-cover"
                />
              </CurtainImage>
            </Float>
          </div>

          <Reveal delay={0.15} blur>
            <p className="eyebrow rule-gold">{t(UI.aboutEyebrow, locale)}</p>
            <h2 className="mt-6 font-display text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.05] text-ink-900">
              {hotel.tagline[locale]}
            </h2>
            <p className="mt-6 leading-relaxed text-ink-500">{hotel.about[locale]}</p>
            <p className="mt-4 leading-relaxed text-ink-500">{hotel.aboutDining[locale]}</p>
            <Magnetic className="mt-9" strength={4}>
              <Link href="/about" className="lyn-ghost lyn-focus">
                {t(UI.discover, locale)}
              </Link>
            </Magnetic>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------ reviews -- */}
      {/* Renders nothing while `reviews` is empty — which it is until the API
          is wired up. See the note in GuestVoices for why it is not filled
          with placeholder testimonials in the meantime. */}
      <GuestVoices reviews={reviews} locale={locale} />

      {/* ---------------------------------------------------------- CTA -- */}
      <section className="px-4 pb-[var(--spacing-section)] sm:px-6">
        <Reveal className="relative mx-auto max-w-6xl overflow-hidden">
          <div className="lyn-finale">
            <Parallax className="lyn-media-layer" distance={70}>
              <Image
                src={img(hotel.media.aboutBanner)}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
              />
            </Parallax>
            <span aria-hidden="true" className="lyn-finale-scrim" />
            <AmbientField className="lyn-ambient-warm" />

            <div className="relative z-10 flex flex-col items-center px-6 py-24 text-center sm:py-32">
              <p className="text-[0.6875rem] tracking-[0.34em] text-gold-300 uppercase">
                {t(UI.reserve, locale)}
              </p>
              <WordReveal
                as="h2"
                text={t(UI.ctaTitle, locale)}
                className="mt-6 max-w-2xl font-display text-[clamp(2rem,5.5vw,4rem)] leading-[1.02] text-white"
              />
              <p className="mt-6 max-w-lg leading-relaxed text-sand-200/90">
                {t(UI.ctaBody, locale)}
              </p>

              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
                <Magnetic>
                  <Link href="/reservation" className="lyn-cta lyn-focus">
                    <span>{t(UI.reserve, locale)}</span>
                  </Link>
                </Magnetic>
                <Magnetic strength={4}>
                  <a
                    href={telHref(contact.phones[0])}
                    className="lyn-ghost lyn-ghost-light lyn-focus"
                  >
                    {t(UI.callUs, locale)} · {contact.phones[0]}
                  </a>
                </Magnetic>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
