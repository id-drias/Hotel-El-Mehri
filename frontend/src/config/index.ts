/**
 * Typed view over the property-wide config at the repository root.
 *
 * `hotel.config.json` is the single source of truth for both stacks: this module
 * is the frontend half, `backend/config/hotel_config.py` is the backend half, and
 * both read the same file. Nothing in `src/` should hardcode the hotel's name,
 * address, phone numbers or social links — import from here instead.
 *
 * The JSON lives above `frontend/` on purpose, so the Django side can load it
 * without reaching into the Next.js source tree. `resolveJsonModule` is already
 * enabled in tsconfig, and Netlify's `base = "frontend"` only sets the working
 * directory — the parent path is still present in the deploy checkout.
 */

import raw from '../../../hotel.config.json';

export type Localized = { fr: string; ar: string };

export const hotelConfig = raw;

/** Convenience re-exports: the fields the layout chrome reaches for constantly. */
export const brand = raw.brand;
export const wordmark = raw.brand.wordmark;

/** `Hôtel El Mehri` in French, `فندق المهري` in Arabic. */
export function brandName(locale: 'fr' | 'ar'): string {
  return locale === 'ar' ? raw.brand.nameAr : raw.brand.name;
}

/** "Hôtel trois étoiles" / "فندق ثلاث نجوم", derived from `brand.stars`. */
const STAR_WORDS_FR = ['', 'une', 'deux', 'trois', 'quatre', 'cinq'] as const;
const STAR_WORDS_AR = ['', 'نجمة', 'نجمتين', 'ثلاث نجوم', 'أربع نجوم', 'خمس نجوم'] as const;

export function starsLabel(locale: 'fr' | 'ar'): string {
  const n = raw.brand.stars;
  return locale === 'ar'
    ? `فندق ${STAR_WORDS_AR[n] ?? n}`
    : `Hôtel ${STAR_WORDS_FR[n] ?? n} étoiles`;
}
