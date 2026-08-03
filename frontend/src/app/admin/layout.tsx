import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { notFound } from 'next/navigation';

import { AdminShell } from '@/components/admin/AdminShell';
import { brand } from '@/config';
import { SignInGate } from '@/components/admin/SignInGate';
import { SessionProvider } from '@/lib/admin/session';
import '@/styles/globals.css';
import '@/styles/admin.css';

/**
 * The admin console lives outside `[locale]`.
 *
 * It is internal tooling: one language, no RTL mirroring, no hreflang, and no
 * business being crawled or translated. Keeping it out of the localised tree
 * also keeps it out of `generateStaticParams`, so it is never prerendered per
 * locale. `middleware.ts` excludes `/admin` from the next-intl matcher, without
 * which every request here would be redirected to `/fr/admin`.
 *
 * Its own fonts, deliberately: Playfair for figures and the wordmark, Inter for
 * the interface. The public site's Cormorant/Jost pairing is a brand asset for
 * guests, not a good choice for dense operational tables.
 */

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-adm-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-adm-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `Console — ${brand.name}`,
  // Internal tooling must never reach an index. This is belt and braces
  // alongside the deployment-level block; it is not a substitute for auth.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Hard gate.
 *
 * There is no authentication layer yet — that is Step 2 — so anyone who can
 * reach the URL can read guest names, contact details and reservation values.
 * Until `ADMIN_CONSOLE_ENABLED` is set, this route 404s, which means an
 * accidental production deploy exposes nothing. Delete this block only when
 * real session checks are in front of it.
 */
function assertEnabled() {
  if (process.env.ADMIN_CONSOLE_ENABLED !== 'true') notFound();
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  assertEnabled();

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body style={{ fontFamily: 'var(--font-adm-sans), system-ui, sans-serif' }}>
        {/* The env gate above is a deployment safety catch, not authentication.
            SignInGate is the real one, and it fails closed: the API rejects
            every request without a staff token regardless of what renders. */}
        <SessionProvider>
          <AdminShell>
            <SignInGate>{children}</SignInGate>
          </AdminShell>
        </SessionProvider>
      </body>
    </html>
  );
}
