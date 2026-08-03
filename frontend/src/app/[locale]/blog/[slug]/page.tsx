import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';

import { ArticleBody } from '@/components/blog/ArticleBody';
import { ArticleCard } from '@/components/blog/ArticleCard';
import { AmbientField, Parallax, Reveal, Stagger, WordReveal } from '@/components/motion';
import { Container } from '@/components/ui/Container';
import { articles, getArticle } from '@/content/articles';
import { img } from '@/content/hotel';
import { isLocale, locales, type Locale } from '@/lib/i18n/config';
import { Link } from '@/lib/i18n/navigation';

export function generateStaticParams() {
  return locales.flatMap((locale) => articles.map((article) => ({ locale, slug: article.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  const l = (isLocale(locale) ? locale : 'fr') as Locale;
  return { title: article.title[l], description: article.excerpt[l] };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const article = getArticle(slug);
  if (!article) notFound();

  const t = await getTranslations({ locale, namespace: 'common' });
  const format = await getFormatter({ locale });
  const l = (isLocale(locale) ? locale : 'fr') as Locale;
  const others = articles.filter((item) => item.slug !== article.slug).slice(0, 3);

  return (
    <>
      {/* Not <PageBanner>: an article headline is content, not a page name, so
          it keeps its own taller crop and its dateline. The treatment is
          otherwise identical — parallax, ambient light, word-by-word title. */}
      <section className="lyn-banner h-[65vh]">
        <Parallax className="lyn-media-layer" distance={70}>
          <Image
            src={img(article.cover)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </Parallax>
        <span aria-hidden="true" className="lyn-banner-scrim" />
        <AmbientField />

        <Container size="wide" className="relative z-10 pb-16">
          <Reveal>
            <time
              dateTime={article.publishedAt}
              className="text-[0.625rem] tracking-[0.22em] text-gold-300 uppercase"
            >
              {format.dateTime(new Date(article.publishedAt), {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>
          </Reveal>

          <WordReveal
            text={article.title[l]}
            delay={0.2}
            className="mt-5 max-w-4xl font-display text-4xl leading-tight text-white sm:text-5xl lg:text-6xl"
          />
        </Container>
      </section>

      <section className="bg-sand-50 py-[var(--spacing-section)]">
        <Container>
          <Reveal>
            <Link
              href="/blog"
              className="text-[0.625rem] tracking-[0.22em] text-ink-400 uppercase transition-colors hover:text-gold-600"
            >
              &larr; {t('backToBlog')}
            </Link>
          </Reveal>

          <Reveal className="mt-12" delay={0.1} blur>
            <ArticleBody body={article.body[l]} />
          </Reveal>
        </Container>
      </section>

      {others.length > 0 ? (
        <section className="bg-sand-100 py-[var(--spacing-section)]">
          <Container size="wide">
            <Stagger className="grid gap-12 md:grid-cols-3">
              {others.map((item) => (
                <ArticleCard key={item.slug} article={item} />
              ))}
            </Stagger>
          </Container>
        </section>
      ) : null}
    </>
  );
}
