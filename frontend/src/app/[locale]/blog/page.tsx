import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ArticleList } from '@/components/blog/ArticleList';
import { PageBanner } from '@/components/layout/PageBanner';
import { Reveal } from '@/components/motion';
import { Container } from '@/components/ui/Container';
import { articles } from '@/content/articles';
import { hotel } from '@/content/hotel';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  return { title: t('title'), description: t('intro') };
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'blog' });

  return (
    <>
      <PageBanner
        eyebrow={t('eyebrow')}
        title={t('title')}
        image={articles[0]?.cover ?? hotel.media.heroBanner}
      />

      <section className="bg-sand-50 py-[var(--spacing-section)]">
        <Container size="wide">
          <Reveal blur>
            <p className="max-w-2xl font-display text-2xl leading-relaxed text-ink-800">
              {t('intro')}
            </p>
          </Reveal>

          <div className="mt-16">
            {articles.length > 0 ? (
              <ArticleList articles={articles} />
            ) : (
              <Reveal>
                <p className="text-ink-400">{t('empty')}</p>
              </Reveal>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
