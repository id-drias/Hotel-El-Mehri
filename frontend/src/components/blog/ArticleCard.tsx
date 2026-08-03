import Image from 'next/image';
import { useFormatter, useLocale, useTranslations } from 'next-intl';

import { StaggerItem } from '@/components/motion';
import type { ArticleContent } from '@/content/articles';
import { img } from '@/content/hotel';
import type { Locale } from '@/lib/i18n/config';
import { Link } from '@/lib/i18n/navigation';

/**
 * Editorial rather than card-like: the image carries the shimmer and the zoom,
 * the text below sits on the page unboxed. No tilt here — a tilting rectangle
 * with no visible edge just makes the type look crooked.
 */
export function ArticleCard({ article }: { article: ArticleContent }) {
  const t = useTranslations('common');
  const locale = useLocale() as Locale;
  const format = useFormatter();

  return (
    <StaggerItem as="article" className="group">
      <Link href={`/blog/${article.slug}`} className="lyn-focus block">
        <div className="lyn-figure relative aspect-3/2 bg-ink-800">
          <Image
            src={img(article.cover)}
            alt={article.title[locale]}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="lyn-img object-cover"
          />
          <span aria-hidden="true" className="lyn-img-veil" />
        </div>
        <time
          dateTime={article.publishedAt}
          className="mt-6 block text-[0.625rem] uppercase tracking-[0.22em] text-gold-600"
        >
          {format.dateTime(new Date(article.publishedAt), {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </time>
        <h3 className="mt-3 font-display text-2xl leading-snug text-ink-900 transition-colors duration-500 group-hover:text-gold-600 group-focus-within:text-gold-600">
          {article.title[locale]}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">{article.excerpt[locale]}</p>
        <span className="mt-5 inline-block text-[0.625rem] tracking-[0.22em] text-ink-400 uppercase transition-colors duration-500 group-hover:text-gold-600 group-focus-within:text-gold-600">
          {t('readMore')}
        </span>
      </Link>
    </StaggerItem>
  );
}
