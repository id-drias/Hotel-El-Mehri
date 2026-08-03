import { useTranslations } from 'next-intl';

import { ArticleCard } from '@/components/blog/ArticleCard';
import { Container } from '@/components/ui/Container';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { articles } from '@/content/articles';

export function ArticlesPreview() {
  const t = useTranslations('home');
  const latest = articles.slice(0, 3);
  if (latest.length === 0) return null;

  return (
    <section className="bg-sand-50 py-[var(--spacing-section)]">
      <Container size="wide">
        <SectionTitle eyebrow={t('articlesEyebrow')} title={t('articlesTitle')} />
        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {latest.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </Container>
    </section>
  );
}
