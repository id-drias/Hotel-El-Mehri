/** Currency and number formatting (DZD, fr-DZ and ar-DZ). */

import { hotelConfig } from '@/config';
import type { Locale } from '@/lib/i18n/config';

/**
 * A nightly rate, formatted for display.
 *
 * `Intl` is given the locale but not the currency: `currency: 'DZD'` renders
 * "DZD 6,360.00", while the hotel — and every Algerian price list — writes
 * "6 360 DA". So the number is grouped by `Intl` and the unit comes from
 * `rates.currencyLabel`, which keeps each locale's own digits and separators.
 *
 * Rates are whole dinars; no fractional part is ever shown.
 */
export function formatRate(amount: number, locale: Locale): string {
  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    maximumFractionDigits: 0,
  }).format(amount);

  return `${formatted} ${hotelConfig.rates.currencyLabel[locale]}`;
}

/** Plain grouped number, no currency unit. */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ').format(value);
}
