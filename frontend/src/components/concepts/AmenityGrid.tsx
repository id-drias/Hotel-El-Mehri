import { Stagger, TiltCard } from '@/components/motion';
import { amenities, type AmenityIcon } from '@/content/amenities';
import type { Locale } from '@/lib/i18n/config';

/**
 * The facilities grid.
 *
 * Line icons, drawn inline rather than pulled from an icon font: eight glyphs
 * at ~200 bytes each is cheaper than any package, they inherit `currentColor`
 * so the gold hover state costs nothing, and there is no flash of missing
 * glyphs before a font loads. Emoji were never an option — the design skill
 * rates them an anti-pattern for UI iconography, and they render as a different
 * picture on every platform.
 *
 * Each icon is decorative: the label beside it carries the meaning, so the SVG
 * is `aria-hidden` and a screen reader announces the tile exactly once.
 */

const ICONS: Record<AmenityIcon, React.ReactNode> = {
  wifi: (
    <>
      <path d="M2.5 8.6a15 15 0 0 1 19 0" />
      <path d="M5.6 12.1a10.4 10.4 0 0 1 12.8 0" />
      <path d="M8.7 15.6a6 6 0 0 1 6.6 0" />
      <circle cx="12" cy="19.2" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  'pool-outdoor': (
    <>
      <circle cx="17.8" cy="5.6" r="2.6" />
      <path d="M7 14V6a2 2 0 0 1 4 0v8" />
      <path d="M7 9.6h4" />
      <path d="M3 17.4c1.5 0 1.5 1.2 3 1.2s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2" />
      <path d="M3 20.9c1.5 0 1.5 1.2 3 1.2s1.5-1.2 3-1.2" />
    </>
  ),
  hammam: (
    <>
      <path d="M8 2.8c-1.2 1.4-1.2 2.8 0 4.2s1.2 2.8 0 4.2" />
      <path d="M12 2.2c-1.2 1.4-1.2 2.8 0 4.2s1.2 2.8 0 4.2" />
      <path d="M16 2.8c-1.2 1.4-1.2 2.8 0 4.2s1.2 2.8 0 4.2" />
      <path d="M3.6 14.4h16.8v.6a6.8 6.8 0 0 1-6.8 6.8h-3.2a6.8 6.8 0 0 1-6.8-6.8z" />
    </>
  ),
  restaurant: (
    <>
      <path d="M6.4 2.8v7.4a2.4 2.4 0 0 0 4.8 0V2.8" />
      <path d="M8.8 10.2V21.2" />
      <path d="M17.6 21.2V2.8c-2 1-3 3-3 6.2 0 2 1 3.2 3 3.4" />
    </>
  ),
  cafe: (
    <>
      <path d="M4 8.5h12v5.8a4.4 4.4 0 0 1-4.4 4.4H8.4A4.4 4.4 0 0 1 4 14.3z" />
      <path d="M16 10.2h1.9a2.6 2.6 0 0 1 0 5.2H16" />
      <path d="M7.4 2.8c-.8.9-.8 1.8 0 2.7M11 2.8c-.8.9-.8 1.8 0 2.7" />
      <path d="M3 21.2h14" />
    </>
  ),
  conference: (
    <>
      <rect x="2.8" y="3.4" width="18.4" height="12" rx="1.8" />
      <path d="M12 15.4v3.2" />
      <path d="M7.6 20.6h8.8" />
    </>
  ),
  garden: (
    <>
      <path d="M12 21.2v-6.6" />
      <path d="M12 14.6c0-3.4-2.2-6-5.4-6.6-.2 3.6 2 6.3 5.4 6.6z" />
      <path d="M12 12.4c0-3.8 2.4-6.6 6-7.2.2 4-2.4 6.9-6 7.2z" />
      <path d="M6.6 21.2h10.8" />
    </>
  ),
  parking: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3.5" />
      <path d="M9.8 17.5V7h3.4a3.2 3.2 0 0 1 0 6.4H9.8" />
    </>
  ),
};

export function AmenityGrid({ locale }: { locale: Locale }) {
  return (
    // `tight` because there are eight tiles: at the standard 90ms step the last
    // one would land three quarters of a second after the first, which stops
    // reading as a cascade and starts reading as lag.
    <Stagger tight className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {amenities.map((amenity) => (
        <TiltCard
          key={amenity.slug}
          as="div"
          max={3}
          className="lyn-amenity lyn-glow-edge items-center text-center"
        >
          <span className="lyn-amenity-icon">
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {ICONS[amenity.icon]}
            </svg>
          </span>
          <span className="text-sm leading-snug text-ink-800">{amenity.label[locale]}</span>
        </TiltCard>
      ))}
    </Stagger>
  );
}
