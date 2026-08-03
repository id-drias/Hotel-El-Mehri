import { Inter, Playfair_Display } from 'next/font/google';

import { brand, wordmark } from '@/config';

/**
 * "Obsidian" — a dark, high-tech concept homepage for an ultra-luxury hotel.
 *
 * Self-contained on purpose: it carries its own fonts, its own colour scale and
 * its own chrome (nav + footer), so it can be mounted without inheriting the
 * site's warm sand/gold theme or its shared Header/Footer.
 *
 * Deliberately a server component — every interaction here is hover, focus or
 * entrance motion, all of which CSS does natively. No client bundle, no
 * animation library, and the whole page streams as static HTML.
 */

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--obs-font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--obs-font-sans',
  display: 'swap',
});

/* ------------------------------------------------------------------ data -- */

const NAV = [
  { label: 'Suites', href: '#suites' },
  { label: 'Sanctuary', href: '#sanctuary' },
  { label: 'Prestige', href: '#prestige' },
  { label: 'Contact', href: '#contact' },
];

type Suite = {
  name: string;
  tag: string;
  copy: string;
  price: string;
  amenities: string[];
  /** Grid placement at lg and up. The first suite anchors the bento. */
  span: string;
  featured?: boolean;
};

const SUITES: Suite[] = [
  {
    name: 'Skyline Penthouse',
    tag: 'Level 88',
    copy: 'Two floors suspended above the cloud line, wrapped in panoramic smart-glass that tunes its own opacity to the hour.',
    price: '12,400',
    amenities: ['AI Concierge', 'Panoramic Smart-Glass', 'Private Elevator', 'Infinity Terrace'],
    span: 'lg:col-span-2 lg:row-span-2',
    featured: true,
  },
  {
    name: 'Bio-Dome Villa',
    tag: 'Garden Level',
    copy: 'A living biosphere under a self-regulating canopy.',
    price: '8,900',
    amenities: ['Climate Biome', 'Hydroponic Atrium'],
    span: 'lg:col-span-1 lg:row-span-1',
  },
  {
    name: 'Aurora Suite',
    tag: 'Level 61',
    copy: 'Circadian light that follows the aurora in real time.',
    price: '6,200',
    amenities: ['Circadian Lighting', 'Sound Bath'],
    span: 'lg:col-span-1 lg:row-span-1',
  },
  {
    name: 'Submerged Pavilion',
    tag: 'Sub-Level 2',
    copy: 'A silent chamber beneath the reservoir, walled in curved aquaria and lit only by the water.',
    price: '9,750',
    amenities: ['Aquarium Walls', 'Acoustic Isolation', 'Private Thermal Pool'],
    span: 'lg:col-span-2 lg:row-span-1',
  },
];

const AMENITIES = [
  {
    name: 'Sub-Zero Spa',
    copy: 'Cryotherapy chambers, mineral thermal circuits and a glacial plunge held at exactly 3°C.',
    meta: 'Level 4 · By appointment',
    icon: (
      <>
        <path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9" />
        <path d="M12 6.8 9.6 4.9M12 6.8l2.4-1.9M12 17.2l-2.4 1.9M12 17.2l2.4 1.9" />
      </>
    ),
  },
  {
    name: 'Autonomous Fine Dining',
    copy: 'A fourteen-seat counter where the tasting menu is composed nightly against your own palate history.',
    meta: 'Level 82 · 14 seats',
    icon: (
      <>
        <path d="M7 3v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M9 13v8" />
        <path d="M16.5 3c-1.4 1.6-2 3.4-2 5.5 0 1.6.7 2.6 2 3V21" />
      </>
    ),
  },
  {
    name: 'Private Heli-Deck',
    copy: 'Direct rooftop arrival with customs cleared in transit. Your suite is open before you land.',
    meta: 'Roof · 24h',
    icon: (
      <>
        <circle cx="12" cy="12" r="8.2" />
        <path d="M9.2 9.2v5.6M14.8 9.2v5.6M9.2 12h5.6" />
      </>
    ),
  },
  {
    name: 'Zero-G Wellness Deck',
    copy: 'Neutral-buoyancy flotation and low-impact training in a chamber tuned to near-weightlessness.',
    meta: 'Level 70 · Members',
    icon: (
      <>
        <circle cx="12" cy="12" r="8.2" />
        <path d="M3.8 12c3.4 2.4 13 2.4 16.4 0M12 3.8c2.6 3.6 2.6 12.8 0 16.4" />
      </>
    ),
  },
];

const PRESTIGE = [
  {
    quote:
      'The most quietly astonishing hotel opening of the decade. Nothing announces itself, and everything anticipates you.',
    name: 'Condé Nast Traveller',
    meta: 'Gold List',
  },
  {
    quote:
      'I have never had a room understand me faster. By the second night I stopped noticing the technology entirely.',
    name: 'A. Marchetti',
    meta: 'Resident, Level 88',
  },
  {
    quote:
      'Service so discreet it borders on telepathy. The benchmark other properties will spend ten years chasing.',
    name: 'Robb Report',
    meta: 'Best of the Best',
  },
];

const ACCOLADES = [
  'FORBES TRAVEL GUIDE',
  'MICHELIN KEYS',
  'RELAIS & CHÂTEAUX',
  'LEADING HOTELS',
  'VIRTUOSO',
];

/* -------------------------------------------------------------- fragments -- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.6875rem] font-medium tracking-[0.34em] text-[var(--obs-gold)] uppercase">
      {children}
    </p>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------- page -- */

export function ObsidianHome() {
  return (
    <div
      className={`${playfair.variable} ${inter.variable} obs relative min-h-screen overflow-x-hidden bg-[var(--obs-bg)] text-[var(--obs-text)] antialiased`}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Ambient field: soft radial lighting + a film grain that keeps the
          large flat blacks from banding on wide gamut displays. */}
      <div aria-hidden="true" className="obs-ambient" />
      <div aria-hidden="true" className="obs-grain" />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-full focus:bg-[var(--obs-gold)] focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-black"
      >
        Skip to content
      </a>

      {/* ---------------------------------------------------------- navbar -- */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 sm:pt-6">
        <nav
          aria-label="Primary"
          className="obs-glass mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full py-3 pr-3 pl-5 sm:pl-7"
        >
          <a
            href="#main"
            className="obs-focus group flex shrink-0 flex-col leading-none"
            aria-label={`${brand.shortName} Obsidian — home`}
          >
            <span className="font-[family-name:var(--obs-font-display)] text-lg tracking-[0.2em] text-white sm:text-xl">
              {wordmark.primary}
            </span>
            <span className="mt-0.5 text-[0.5rem] tracking-[0.52em] text-[var(--obs-gold)] sm:text-[0.5625rem]">
              OBSIDIAN
            </span>
          </a>

          <ul className="hidden items-center gap-9 lg:flex">
            {NAV.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="obs-focus obs-underline relative py-1 text-[0.8125rem] tracking-[0.12em] text-[var(--obs-text-dim)] transition-colors duration-300 hover:text-white"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <a
            href="#reserve"
            className="obs-cta obs-focus shrink-0 text-[0.75rem] sm:text-[0.8125rem]"
          >
            <span>Reserve a Suite</span>
          </a>
        </nav>
      </header>

      <main id="main">
        {/* ------------------------------------------------------- hero -- */}
        <section className="relative flex min-h-[100svh] flex-col justify-center px-4 pt-36 pb-16 sm:px-6 sm:pt-40">
          <div className="mx-auto w-full max-w-6xl">
            <div className="obs-rise flex flex-col items-center text-center">
              <Eyebrow>Seven Stars · Est. 2031</Eyebrow>

              <h1 className="mt-7 max-w-4xl font-[family-name:var(--obs-font-display)] text-[clamp(2.75rem,9vw,7rem)] leading-[0.94] font-normal tracking-[-0.02em] text-white">
                The Future of <span className="obs-shimmer italic">Sanctuary</span>
              </h1>

              <p className="mt-8 max-w-xl text-base leading-relaxed text-[var(--obs-text-dim)] sm:text-lg">
                Eighty-eight floors of engineered stillness. A residence that learns your rhythm
                before you arrive, and never once asks you to notice.
              </p>
            </div>

            {/* Booking bar. Labels stay visible — placeholder-only fields fail
                the moment a value is entered. */}
            <form
              id="reserve"
              className="obs-rise obs-rise-2 obs-glass mt-14 rounded-2xl p-2 sm:mt-16"
              action="#suites"
            >
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <label className="obs-field">
                  <span className="obs-field-label">Check-in</span>
                  <input type="date" name="checkin" className="obs-input" defaultValue="" />
                </label>

                <label className="obs-field">
                  <span className="obs-field-label">Check-out</span>
                  <input type="date" name="checkout" className="obs-input" defaultValue="" />
                </label>

                <label className="obs-field">
                  <span className="obs-field-label">Guests</span>
                  <select name="guests" className="obs-input obs-select" defaultValue="2">
                    <option value="1">1 Guest</option>
                    <option value="2">2 Guests</option>
                    <option value="3">3 Guests</option>
                    <option value="4">4 Guests</option>
                    <option value="5">5+ · Private Floor</option>
                  </select>
                </label>

                <label className="obs-field">
                  <span className="obs-field-label">Suite Type</span>
                  <select name="suite" className="obs-input obs-select" defaultValue="any">
                    <option value="any">Any Residence</option>
                    <option value="penthouse">Skyline Penthouse</option>
                    <option value="biodome">Bio-Dome Villa</option>
                    <option value="aurora">Aurora Suite</option>
                    <option value="pavilion">Submerged Pavilion</option>
                  </select>
                </label>

                <div className="flex items-stretch bg-[var(--obs-panel)] p-2">
                  <button
                    type="submit"
                    className="obs-cta obs-focus w-full justify-center px-8 text-[0.8125rem]"
                  >
                    <span>Check Availability</span>
                  </button>
                </div>
              </div>
            </form>

            <p className="obs-rise obs-rise-3 mt-6 text-center text-[0.6875rem] tracking-[0.22em] text-[var(--obs-text-muted)] uppercase">
              Average response · Under 90 seconds
            </p>
          </div>
        </section>

        {/* ----------------------------------------------------- suites -- */}
        <section id="suites" className="relative scroll-mt-28 px-4 py-24 sm:px-6 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Eyebrow>The Residences</Eyebrow>
                <h2 className="mt-5 max-w-lg font-[family-name:var(--obs-font-display)] text-[clamp(2rem,5vw,3.5rem)] leading-[1.02] tracking-[-0.015em] text-white">
                  Four ways to disappear
                </h2>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-[var(--obs-text-dim)] sm:text-right">
                Each residence is commissioned once and never repeated.
              </p>
            </div>

            <div className="mt-14 grid auto-rows-[minmax(0,1fr)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SUITES.map((suite) => (
                <article
                  key={suite.name}
                  className={`obs-card obs-focus-within group relative flex flex-col justify-between overflow-hidden rounded-2xl p-7 sm:p-8 ${suite.span} ${
                    suite.featured ? 'min-h-[26rem]' : 'min-h-[15rem]'
                  }`}
                >
                  {/* The featured card is twice the height of the others, so it
                      gets an atmospheric vista instead of dead space — a lit
                      horizon read through the suite's smart-glass. Swap for a
                      real <Image> when photography is ready. */}
                  {suite.featured ? <span aria-hidden="true" className="obs-vista" /> : null}

                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <span className="text-[0.625rem] tracking-[0.3em] text-[var(--obs-text-muted)] uppercase">
                      {suite.tag}
                    </span>
                    <span className="obs-arrow" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.2}
                        className="h-4 w-4"
                      >
                        <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>

                  <div className="relative z-10 mt-10">
                    <h3
                      className={`font-[family-name:var(--obs-font-display)] leading-[1.05] tracking-[-0.01em] text-white ${
                        suite.featured ? 'text-4xl sm:text-5xl' : 'text-2xl'
                      }`}
                    >
                      {suite.name}
                    </h3>

                    <p
                      className={`mt-4 leading-relaxed text-[var(--obs-text-dim)] ${
                        suite.featured ? 'max-w-md text-base' : 'text-sm'
                      }`}
                    >
                      {suite.copy}
                    </p>

                    <ul className="mt-6 flex flex-wrap gap-2">
                      {suite.amenities.map((a) => (
                        <li key={a} className="obs-chip">
                          {a}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-7 flex items-baseline gap-2 border-t border-white/[0.07] pt-6">
                      <span className="font-[family-name:var(--obs-font-display)] text-2xl text-white">
                        €{suite.price}
                      </span>
                      <span className="text-[0.6875rem] tracking-[0.2em] text-[var(--obs-text-muted)] uppercase">
                        / night
                      </span>
                      <a
                        href="#reserve"
                        className="obs-focus ml-auto text-[0.75rem] tracking-[0.16em] text-[var(--obs-gold)] uppercase transition-colors duration-300 hover:text-[var(--obs-gold-bright)]"
                      >
                        Reserve
                        <span className="sr-only"> the {suite.name}</span>
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- sanctuary -- */}
        <section id="sanctuary" className="relative scroll-mt-28 px-4 py-24 sm:px-6 sm:py-32">
          <div className="obs-hairline mx-auto mb-20 max-w-6xl" />
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <Eyebrow>The Sanctuary</Eyebrow>
              <h2 className="mt-5 font-[family-name:var(--obs-font-display)] text-[clamp(2rem,5vw,3.5rem)] leading-[1.02] tracking-[-0.015em] text-white">
                Everything, already arranged
              </h2>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-white/[0.06] sm:grid-cols-2">
              {AMENITIES.map((item) => (
                <div key={item.name} className="obs-tile group relative p-8 sm:p-10">
                  <span className="obs-tile-icon text-[var(--obs-gold)]">
                    <Icon>{item.icon}</Icon>
                  </span>

                  <h3 className="mt-7 font-[family-name:var(--obs-font-display)] text-2xl text-white">
                    {item.name}
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--obs-text-dim)]">
                    {item.copy}
                  </p>
                  <p className="mt-6 text-[0.625rem] tracking-[0.28em] text-[var(--obs-text-muted)] uppercase">
                    {item.meta}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------- prestige -- */}
        <section id="prestige" className="relative scroll-mt-28 px-4 py-24 sm:px-6 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center text-center">
              <Eyebrow>Prestige</Eyebrow>
              <h2 className="mt-5 max-w-2xl font-[family-name:var(--obs-font-display)] text-[clamp(2rem,5vw,3.5rem)] leading-[1.02] tracking-[-0.015em] text-white">
                Spoken of quietly
              </h2>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
              {PRESTIGE.map((item) => (
                <figure key={item.name} className="obs-card rounded-2xl p-8">
                  <span
                    aria-hidden="true"
                    className="block font-[family-name:var(--obs-font-display)] text-5xl leading-none text-[var(--obs-gold)]/40"
                  >
                    &ldquo;
                  </span>
                  <blockquote className="mt-4 font-[family-name:var(--obs-font-display)] text-lg leading-[1.5] text-white/90 italic">
                    {item.quote}
                  </blockquote>
                  <figcaption className="mt-7 border-t border-white/[0.07] pt-5">
                    <span className="block text-sm text-white">{item.name}</span>
                    <span className="mt-1 block text-[0.625rem] tracking-[0.26em] text-[var(--obs-text-muted)] uppercase">
                      {item.meta}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>

            {/* Accolade bar */}
            <ul className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 border-y border-white/[0.07] py-8">
              {ACCOLADES.map((a) => (
                <li
                  key={a}
                  className="text-[0.625rem] tracking-[0.3em] text-[var(--obs-text-muted)] transition-colors duration-500 hover:text-[var(--obs-titanium)]"
                >
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------ closing CTA -- */}
        <section className="relative px-4 py-24 sm:px-6 sm:py-36">
          <div className="obs-finale relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-24 text-center sm:px-16 sm:py-32">
            <div className="relative z-10 flex flex-col items-center">
              <Eyebrow>Reservations</Eyebrow>
              <h2 className="mt-6 max-w-3xl font-[family-name:var(--obs-font-display)] text-[clamp(2.25rem,6.5vw,5rem)] leading-[0.98] tracking-[-0.02em] text-white">
                Your floor is <span className="obs-shimmer italic">waiting</span>
              </h2>
              <p className="mt-7 max-w-lg text-base leading-relaxed text-[var(--obs-text-dim)]">
                Eighteen residences remain for the coming season. Each release is offered first to
                members, then to no one else.
              </p>

              <div className="mt-11 flex flex-col items-center gap-4 sm:flex-row">
                <a href="#reserve" className="obs-cta obs-focus px-9 py-4 text-sm">
                  <span>Reserve a Suite</span>
                </a>
                <a href="#contact" className="obs-ghost obs-focus">
                  Speak with a Concierge
                </a>
              </div>

              <p className="mt-9 text-[0.625rem] tracking-[0.28em] text-[var(--obs-text-muted)] uppercase">
                Private aviation &amp; ground transfer arranged on request
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------- footer -- */}
      <footer id="contact" className="relative scroll-mt-28 px-4 pb-14 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="obs-hairline mb-14" />

          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <span className="block font-[family-name:var(--obs-font-display)] text-xl tracking-[0.2em] text-white">
                {wordmark.primary}
              </span>
              <span className="mt-1 block text-[0.5625rem] tracking-[0.52em] text-[var(--obs-gold)]">
                OBSIDIAN
              </span>
              <p className="mt-6 max-w-xs text-sm leading-relaxed text-[var(--obs-text-dim)]">
                A residence for those who have stopped counting.
              </p>
            </div>

            <div>
              <h3 className="obs-foot-head">Location</h3>
              <address className="mt-5 space-y-1 text-sm leading-relaxed text-[var(--obs-text-dim)] not-italic">
                <span className="block">88 Meridian Tower</span>
                <span className="block">Marina District</span>
                <span className="block">Neo-Tokyo 104-0061</span>
              </address>
              <a
                href="tel:+81000000000"
                className="obs-focus mt-4 inline-block text-sm text-[var(--obs-titanium)] transition-colors duration-300 hover:text-white"
              >
                +81 (0) 3 0000 0000
              </a>
            </div>

            <div>
              <h3 className="obs-foot-head">Guests</h3>
              <ul className="mt-5 space-y-3">
                {['Private Membership', 'Suites & Residences', 'Concierge', 'Press'].map((l) => (
                  <li key={l}>
                    <a
                      href="#contact"
                      className="obs-focus text-sm text-[var(--obs-text-dim)] transition-colors duration-300 hover:text-white"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="obs-foot-head">Legal</h3>
              <ul className="mt-5 space-y-3">
                {['Terms of Stay', 'Privacy', 'Accessibility', 'Cookies'].map((l) => (
                  <li key={l}>
                    <a
                      href="#contact"
                      className="obs-focus text-sm text-[var(--obs-text-dim)] transition-colors duration-300 hover:text-white"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] pt-8 sm:flex-row">
            <p className="text-[0.625rem] tracking-[0.24em] text-[var(--obs-text-muted)] uppercase">
              © {new Date().getFullYear()} {brand.shortName} Obsidian
            </p>
            <p className="text-[0.625rem] tracking-[0.24em] text-[var(--obs-text-muted)] uppercase">
              Member · Leading Hotels of the World
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* --------------------------------------------------------------------- css -- */
/* Kept in one place so the component stays portable — it depends on no theme
   tokens from the host app. */

const CSS = `
.obs {
  --obs-bg: #09090B;
  --obs-panel: #0D0D11;
  --obs-gold: #D4B872;          /* 10.33:1 on obsidian */
  --obs-gold-bright: #E8DCB5;   /* 14.53:1 */
  --obs-titanium: #C2C8D0;      /* 11.81:1 */
  --obs-ice: #8FD8EC;           /* 12.51:1 */
  --obs-text: #F5F5F7;          /* 18.27:1 */
  --obs-text-dim: #A9AEB8;      /*  8.94:1 */
  --obs-text-muted: #7A808C;    /*  5.02:1 — smallest type still clears AA */
  --obs-ease: cubic-bezier(0.16, 1, 0.3, 1);
  font-family: var(--obs-font-sans), system-ui, sans-serif;
  font-weight: 300;
}

/* Ambient lighting. Three slow-drifting pools rather than one flat wash, so the
   background reads as lit rather than coloured. */
.obs-ambient {
  position: fixed;
  inset: -20%;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(38rem 38rem at 18% 8%, rgba(212, 184, 114, 0.10), transparent 62%),
    radial-gradient(44rem 44rem at 85% 22%, rgba(143, 216, 236, 0.07), transparent 64%),
    radial-gradient(52rem 40rem at 50% 100%, rgba(212, 184, 114, 0.06), transparent 68%);
  animation: obs-drift 26s var(--obs-ease) infinite alternate;
}

@keyframes obs-drift {
  from { transform: translate3d(-1.5%, -1%, 0) scale(1); }
  to   { transform: translate3d(1.5%, 1.5%, 0) scale(1.06); }
}

/* Film grain — stops wide flat blacks from banding on OLED/P3. */
.obs-grain {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0.16;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
}

.obs main, .obs header, .obs footer { position: relative; z-index: 2; }

/* Frosted surfaces ------------------------------------------------------- */
.obs-glass {
  background: rgba(255, 255, 255, 0.035);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow:
    0 1px 0 0 rgba(255, 255, 255, 0.06) inset,
    0 24px 70px -30px rgba(0, 0, 0, 0.9);
}

.obs-card {
  background: linear-gradient(160deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018));
  backdrop-filter: blur(18px) saturate(135%);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
  border: 1px solid rgba(255, 255, 255, 0.085);
  box-shadow: 0 1px 0 0 rgba(255,255,255,0.05) inset;
  transition:
    border-color 420ms var(--obs-ease),
    box-shadow 420ms var(--obs-ease),
    transform 420ms var(--obs-ease);
}

/* The glow: a warm rim plus a wide bloom, never a hard ring. */
.obs-card:hover {
  transform: translateY(-3px);
  border-color: rgba(212, 184, 114, 0.42);
  box-shadow:
    0 1px 0 0 rgba(255,255,255,0.07) inset,
    0 0 0 1px rgba(212, 184, 114, 0.10),
    0 30px 80px -34px rgba(212, 184, 114, 0.30),
    0 18px 60px -30px rgba(0, 0, 0, 0.95);
}

/* Sweep of light across the card face on hover. */
.obs-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(30rem 18rem at 50% -10%, rgba(212,184,114,0.16), transparent 70%);
  transition: opacity 520ms var(--obs-ease);
}
.obs-card:hover::after { opacity: 1; }

.obs-arrow {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  color: var(--obs-text-muted);
  border: 1px solid rgba(255,255,255,0.10);
  transition: color 380ms var(--obs-ease), border-color 380ms var(--obs-ease), transform 380ms var(--obs-ease);
}
.obs-card:hover .obs-arrow {
  color: var(--obs-gold);
  border-color: rgba(212,184,114,0.45);
  transform: translate3d(2px, -2px, 0);
}

/* Atmospheric vista for the featured suite: a city glow under a horizon
   hairline, drifting slowly so the card never feels static. */
.obs-vista {
  position: absolute;
  inset: 0 0 42% 0;
  pointer-events: none;
  border-radius: inherit;
  background:
    linear-gradient(180deg, transparent 62%, rgba(212, 184, 114, 0.22) 63%, transparent 64%),
    radial-gradient(24rem 10rem at 62% 68%, rgba(212, 184, 114, 0.20), transparent 70%),
    radial-gradient(30rem 16rem at 25% 84%, rgba(143, 216, 236, 0.14), transparent 72%),
    linear-gradient(180deg, rgba(143, 216, 236, 0.05), transparent 55%);
  mask-image: linear-gradient(180deg, #000 60%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, #000 60%, transparent 100%);
  animation: obs-vista 30s var(--obs-ease) infinite alternate;
}
@keyframes obs-vista {
  from { transform: translate3d(-1%, 0, 0); }
  to   { transform: translate3d(1%, -1.5%, 0); }
}

.obs-chip {
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  padding: 0.3125rem 0.6875rem;
  border-radius: 9999px;
  color: var(--obs-text-dim);
  background: rgba(255,255,255,0.045);
  border: 1px solid rgba(255,255,255,0.08);
  transition: color 380ms var(--obs-ease), border-color 380ms var(--obs-ease);
}
.obs-card:hover .obs-chip { color: var(--obs-titanium); border-color: rgba(255,255,255,0.16); }

/* Amenity tiles --------------------------------------------------------- */
.obs-tile {
  background: var(--obs-panel);
  transition: background 460ms var(--obs-ease);
}
.obs-tile:hover { background: rgba(255,255,255,0.03); }
.obs-tile-icon {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 9999px;
  border: 1px solid rgba(212,184,114,0.28);
  background: rgba(212,184,114,0.06);
  transition: box-shadow 460ms var(--obs-ease), border-color 460ms var(--obs-ease);
}
.obs-tile:hover .obs-tile-icon {
  border-color: rgba(212,184,114,0.55);
  box-shadow: 0 0 30px -6px rgba(212,184,114,0.45);
}

/* Buttons --------------------------------------------------------------- */
.obs-cta {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  overflow: hidden;
  cursor: pointer;
  border-radius: 9999px;
  padding: 0.8125rem 1.5rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #0A0A0C;
  background: linear-gradient(135deg, #E8DCB5, #D4B872 45%, #C9A961);
  border: 1px solid rgba(232, 220, 181, 0.5);
  box-shadow: 0 10px 34px -14px rgba(212, 184, 114, 0.75);
  transition: box-shadow 380ms var(--obs-ease), transform 380ms var(--obs-ease);
}
.obs-cta > span { position: relative; z-index: 1; }
.obs-cta::before {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-120%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent);
  transition: transform 900ms var(--obs-ease);
}
.obs-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 46px -14px rgba(212, 184, 114, 0.95);
}
.obs-cta:hover::before { transform: translateX(120%); }
.obs-cta:active { transform: translateY(0) scale(0.985); }

.obs-ghost {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  border-radius: 9999px;
  padding: 0.8125rem 1.75rem;
  font-size: 0.8125rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--obs-titanium);
  border: 1px solid rgba(255,255,255,0.16);
  transition: color 380ms var(--obs-ease), border-color 380ms var(--obs-ease), background 380ms var(--obs-ease);
}
.obs-ghost:hover {
  color: #fff;
  border-color: rgba(212,184,114,0.5);
  background: rgba(212,184,114,0.07);
}

/* Booking bar ----------------------------------------------------------- */
.obs-field {
  display: flex;
  flex-direction: column;
  gap: 0.4375rem;
  padding: 1rem 1.25rem;
  background: var(--obs-panel);
  cursor: pointer;
  transition: background 380ms var(--obs-ease);
}
.obs-field:hover { background: rgba(255,255,255,0.028); }
.obs-field-label {
  font-size: 0.5625rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--obs-text-muted);
}
.obs-input {
  width: 100%;
  min-height: 1.75rem;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 0.9375rem;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}
.obs-input::-webkit-calendar-picker-indicator {
  filter: invert(1);
  opacity: 0.45;
  cursor: pointer;
}
.obs-input:focus-visible { color: var(--obs-gold-bright); }
.obs-select { appearance: none; }
.obs-select option { background: #0D0D11; color: #F5F5F7; }

/* Nav underline --------------------------------------------------------- */
.obs-underline::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  height: 1px;
  width: 100%;
  transform: scaleX(0);
  transform-origin: right;
  background: var(--obs-gold);
  transition: transform 420ms var(--obs-ease);
}
.obs-underline:hover::after { transform: scaleX(1); transform-origin: left; }

/* Closing panel --------------------------------------------------------- */
.obs-finale {
  border: 1px solid rgba(255,255,255,0.08);
  background:
    radial-gradient(40rem 26rem at 50% 0%, rgba(212,184,114,0.16), transparent 66%),
    radial-gradient(34rem 24rem at 12% 100%, rgba(143,216,236,0.10), transparent 68%),
    linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.012));
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  box-shadow: 0 1px 0 0 rgba(255,255,255,0.07) inset, 0 40px 120px -50px rgba(0,0,0,0.95);
}

.obs-hairline {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212,184,114,0.35), transparent);
}

.obs-foot-head {
  font-size: 0.625rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--obs-gold);
}

/* Champagne shimmer on the two hero words. */
.obs-shimmer {
  background: linear-gradient(100deg, #E8DCB5 20%, #FFF8E2 40%, #C9A961 60%, #E8DCB5 80%);
  background-size: 220% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: obs-shimmer 7s linear infinite;
}
@keyframes obs-shimmer {
  to { background-position: 220% center; }
}

/* Entrance ------------------------------------------------------------- */
.obs-rise {
  animation: obs-rise 1s var(--obs-ease) both;
}
.obs-rise-2 { animation-delay: 160ms; }
.obs-rise-3 { animation-delay: 300ms; }
@keyframes obs-rise {
  from { opacity: 0; transform: translate3d(0, 22px, 0); }
  to   { opacity: 1; transform: none; }
}

/* Focus ----------------------------------------------------------------- */
.obs-focus:focus-visible {
  outline: 2px solid var(--obs-gold-bright);
  outline-offset: 3px;
  border-radius: 4px;
}
.obs-focus-within:focus-within {
  border-color: rgba(212,184,114,0.5);
  box-shadow: 0 0 0 1px rgba(212,184,114,0.28);
}

@media (prefers-reduced-motion: reduce) {
  .obs *, .obs *::before, .obs *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .obs-ambient { animation: none; }
  .obs-card:hover { transform: none; }
}
`;
