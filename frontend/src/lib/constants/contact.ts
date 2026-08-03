/** Single source of truth - the old site duplicated this block four times. */
import { hotelConfig } from '@/config';

/** Digits only, for `tel:` and `fax:` hrefs. */
const compact = (v: string) => v.replace(/\s/g, '');

export const contact = {
  email: hotelConfig.contact.email,
  phones: hotelConfig.contact.phones.map(compact),
  mobile: compact(hotelConfig.contact.mobile),
  fax: compact(hotelConfig.contact.fax),
  facebook: hotelConfig.contact.facebook,
  instagram: hotelConfig.contact.instagram,
} as const;
