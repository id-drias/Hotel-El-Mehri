import { setRequestLocale } from 'next-intl/server';

import { ElMehriHome } from '@/components/concepts/ElMehriHome';
import { isLocale, type Locale } from '@/lib/i18n/config';

/**
 * The previous composition (Hero / WelcomeSection / RoomsPreview / VideoTour /
 * DiningSection / WellnessSection / EventsSection / GalleryPreview /
 * ArticlesPreview / LocationMap) is still intact under
 * `src/components/sections/` — restoring it is a one-file revert of this page.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ElMehriHome locale={(isLocale(locale) ? locale : 'fr') as Locale} />;
}
