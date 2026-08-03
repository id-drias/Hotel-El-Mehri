import { Reveal, Stagger, TiltCard } from '@/components/motion';
import { Rating } from '@/components/ui/Rating';
import type { Locale } from '@/lib/i18n/config';
import type { Review } from '@/types/review';

/**
 * Guest reviews.
 *
 * Renders nothing at all when there are none. That is the whole design: the
 * section is wired to the real `Review` shape the Django API will return, and
 * until that endpoint is live the homepage passes an empty array and the block
 * simply is not there.
 *
 * The alternative — shipping three invented testimonials as placeholders — was
 * rejected. Fabricated reviews attributed to named guests are a legal exposure
 * for a trading hotel in a way that lorem ipsum in a heading never is, and
 * placeholder copy has a habit of surviving to production.
 *
 * To light it up: fetch approved reviews in `app/[locale]/page.tsx` and pass
 * them down. Nothing else here needs to change.
 */

const UI = {
  eyebrow: { fr: 'Témoignages', ar: 'شهادات' },
  title: { fr: 'Ce que disent nos hôtes', ar: 'ما يقوله ضيوفنا' },
  ratedBy: { fr: 'Note du séjour', ar: 'تقييم الإقامة' },
} as const;

/** Renders as `15 mars 2026` / `١٥ مارس ٢٠٢٦` rather than an ISO string. */
function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function GuestVoices({ reviews, locale }: { reviews: Review[]; locale: Locale }) {
  if (reviews.length === 0) return null;

  return (
    <section className="px-4 py-[var(--spacing-section)] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl" blur>
          <p className="eyebrow rule-gold">{UI.eyebrow[locale]}</p>
          <h2 className="mt-6 font-display text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.05] text-ink-900">
            {UI.title[locale]}
          </h2>
        </Reveal>

        <Stagger
          tight={reviews.length > 8}
          className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {reviews.map((review) => (
            <TiltCard key={review.id} max={4} className="lyn-review lyn-glow-edge">
              <span aria-hidden="true" className="lyn-review-mark">
                &ldquo;
              </span>

              <Rating
                value={review.rating}
                label={`${UI.ratedBy[locale]} — ${review.rating}/5`}
                className="lyn-stars"
              />

              {review.title ? (
                <h3 className="font-display text-xl text-ink-900">{review.title}</h3>
              ) : null}

              <p className="text-sm leading-relaxed text-ink-500">{review.content}</p>

              <p className="mt-auto border-t border-ink-800/10 pt-5 text-[0.6875rem] tracking-[0.18em] text-ink-500 uppercase">
                {review.authorName}
                {review.publishedAt ? ` · ${formatDate(review.publishedAt, locale)}` : ''}
              </p>
            </TiltCard>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
