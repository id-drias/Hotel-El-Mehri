import createMiddleware from 'next-intl/middleware';

import { routing } from '@/lib/i18n/navigation';

export default createMiddleware(routing);

export const config = {
  // Run on everything except static assets, API routes and the admin console.
  //
  // The backslash must be escaped: in a JS string '\.' collapses to '.', which
  // turned the lookahead into `.*..*` and excluded every path of length >= 1 —
  // so unlocalised deep links like /gallery 404'd instead of redirecting.
  //
  // `admin` is excluded because the console is not localised. Without it,
  // next-intl treats /admin as a missing-locale path and redirects to
  // /fr/admin, which does not exist.
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)'],
};
