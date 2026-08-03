import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <section className="flex min-h-screen items-center bg-ink-950 text-center">
      <Container size="narrow">
        <p className="eyebrow">404</p>
        <h1 className="rule-gold rule-gold-center mt-4 font-display text-5xl text-sand-50">
          {t('title')}
        </h1>
        <p className="mt-8 text-sand-300/80">{t('intro')}</p>
        <Button href="/" variant="light" className="mt-12">
          {t('cta')}
        </Button>
      </Container>
    </section>
  );
}
