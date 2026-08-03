import { useLocale, useTranslations } from 'next-intl';

import { contact, hotel, telHref } from '@/content/hotel';
import type { Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils/cn';

type Props = { tone?: 'dark' | 'light'; className?: string };

/**
 * Single source of truth for the contact details — the old site repeated this
 * block verbatim in the header, the footer and twice on the contact page.
 */
export function ContactBlock({ tone = 'dark', className }: Props) {
  const t = useTranslations('contact');
  const locale = useLocale() as Locale;

  const muted = tone === 'light' ? 'text-sand-300/70' : 'text-ink-400';
  const strong = tone === 'light' ? 'text-sand-100' : 'text-ink-800';
  const link = tone === 'light' ? 'hover:text-gold-300' : 'hover:text-gold-600';

  return (
    <div className={cn('space-y-6 text-sm', className)}>
      <div>
        <p className={cn('text-[0.625rem] uppercase tracking-[0.22em]', muted)}>{t('address')}</p>
        <address className={cn('mt-2 not-italic', strong)}>
          {hotel.address.street}
          <br />
          {hotel.address.postalCode} {hotel.address.city}, {hotel.address.country[locale]}
        </address>
      </div>

      <div>
        <p className={cn('text-[0.625rem] uppercase tracking-[0.22em]', muted)}>{t('phone')}</p>
        <div className={cn('mt-2 flex flex-col gap-1', strong)}>
          {contact.phones.map((phone) => (
            <a key={phone} href={telHref(phone)} className={cn('transition-colors', link)}>
              {phone}
            </a>
          ))}
          {/* Optional in hotel.config.json — an empty value must not render an
              empty tel: link. Same for the fax below. */}
          {contact.mobile ? (
            <a href={telHref(contact.mobile)} className={cn('transition-colors', link)}>
              {contact.mobile} <span className={muted}>({t('mobile')})</span>
            </a>
          ) : null}
          {contact.fax ? (
            <p className={muted}>
              {t('fax')} {contact.fax}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <p className={cn('text-[0.625rem] uppercase tracking-[0.22em]', muted)}>{t('email')}</p>
        <a
          href={`mailto:${contact.email}`}
          className={cn('mt-2 inline-block transition-colors', strong, link)}
        >
          {contact.email}
        </a>
      </div>
    </div>
  );
}
