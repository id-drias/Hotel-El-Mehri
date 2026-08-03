'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Magnetic } from '@/components/motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { apiFetch } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Locale } from '@/lib/i18n/config';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function ContactForm() {
  const t = useTranslations('contact');
  const locale = useLocale() as Locale;
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');

    const data = new FormData(event.currentTarget);

    try {
      await apiFetch(endpoints.contactMessages, {
        method: 'POST',
        locale,
        body: {
          full_name: data.get('fullName'),
          email: data.get('email'),
          phone_number: data.get('phoneNumber'),
          subject: data.get('subject'),
          content: data.get('content'),
        },
      });
      setStatus('sent');
      event.currentTarget.reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="border border-gold-500/40 bg-sand-100 p-10 text-center">
        <p className="font-display text-2xl text-ink-900">{t('success')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="grid gap-8 sm:grid-cols-2">
        <Input label={t('fullName')} name="fullName" required autoComplete="name" />
        <Input label={t('emailField')} name="email" type="email" required autoComplete="email" />
      </div>
      <div className="grid gap-8 sm:grid-cols-2">
        <Input label={t('phoneField')} name="phoneNumber" type="tel" autoComplete="tel" />
        <Input label={t('subject')} name="subject" required />
      </div>
      <Textarea label={t('message')} name="content" required rows={6} />

      {status === 'error' ? <p className="text-sm text-red-700">{t('error')}</p> : null}

      <Magnetic>
        <Button type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? t('sending') : t('send')}
        </Button>
      </Magnetic>
    </form>
  );
}
