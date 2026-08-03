'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('error');

  return (
    <section className="flex min-h-screen items-center bg-sand-50 text-center">
      <Container size="narrow">
        <h1 className="rule-gold rule-gold-center font-display text-4xl text-ink-900">
          {t('title')}
        </h1>
        <p className="mt-8 text-ink-500">{t('intro')}</p>
        <Button onClick={reset} className="mt-12">
          {t('retry')}
        </Button>
      </Container>
    </section>
  );
}
