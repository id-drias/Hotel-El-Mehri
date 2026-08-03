import { ArticleCard } from './ArticleCard';
import { Stagger } from '@/components/motion';
import type { ArticleContent } from '@/content/articles';

export function ArticleList({ articles }: { articles: ArticleContent[] }) {
  return (
    // Tightened past eight posts so a long archive doesn't take three seconds
    // to finish arriving.
    <Stagger tight={articles.length > 8} className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard key={article.slug} article={article} />
      ))}
    </Stagger>
  );
}
