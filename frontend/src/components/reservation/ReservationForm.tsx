'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { GuestCounter } from './GuestCounter';
import { RoomSelector } from './RoomSelector';
import { Magnetic } from '@/components/motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { apiFetch } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Locale } from '@/lib/i18n/config';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/** Today in YYYY-MM-DD, local time — no timezone arithmetic anywhere. */
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const diff = (end.getTime() - start.getTime()) / 86_400_000;
  return diff > 0 ? diff : 0;
}

export function ReservationForm() {
  const t = useTranslations('reservation');
  const locale = useLocale() as Locale;

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectedRooms, setSelectedRooms] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [reference, setReference] = useState<string | null>(null);

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);

  const boardOptions = (['room_only', 'bb', 'hb', 'fb'] as const).map((value) => ({
    value,
    label: t(`boardOptions.${value}`),
  }));

  function setRoomQuantity(slug: string, quantity: number) {
    setSelectedRooms((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[slug];
      else next[slug] = quantity;
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');

    const data = new FormData(event.currentTarget);

    try {
      const result = await apiFetch<{ reference: string }>(endpoints.reservations, {
        method: 'POST',
        locale,
        body: {
          first_name: data.get('firstName'),
          last_name: data.get('lastName'),
          email: data.get('email'),
          phone_number: data.get('phoneNumber'),
          // Plain calendar dates. The old site shifted these by +8 hours
          // before sending, which corrupted bookings near midnight.
          check_in: checkIn,
          check_out: checkOut,
          adults,
          children,
          board: data.get('board'),
          message: data.get('message'),
          rooms: Object.entries(selectedRooms).map(([slug, quantity]) => ({
            room: slug,
            quantity,
          })),
        },
      });
      setReference(result?.reference ?? null);
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="border border-gold-500/40 bg-sand-100 p-12 text-center">
        <p className="font-display text-3xl text-ink-900">{t('success')}</p>
        {reference ? (
          <p className="mt-4 text-[0.6875rem] uppercase tracking-[0.22em] text-gold-600">
            {reference}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-16">
      <fieldset>
        <legend className="rule-gold font-display text-2xl text-ink-900">{t('stay')}</legend>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label={t('checkIn')}
            name="checkIn"
            type="date"
            required
            min={today()}
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
          />
          <Input
            label={t('checkOut')}
            name="checkOut"
            type="date"
            required
            min={checkIn || today()}
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
          />
          <GuestCounter label={t('adults')} value={adults} min={1} onChange={setAdults} />
          <GuestCounter label={t('children')} value={children} onChange={setChildren} />
        </div>

        <div className="mt-8 max-w-xs">
          <Select label={t('board')} name="board" options={boardOptions} defaultValue="bb" />
        </div>

        {nights > 0 ? (
          <p className="mt-6 text-sm text-ink-400">
            {nights} {t('nights')}
          </p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="rule-gold font-display text-2xl text-ink-900">{t('roomsTitle')}</legend>
        <div className="mt-10">
          <RoomSelector selected={selectedRooms} onChange={setRoomQuantity} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="rule-gold font-display text-2xl text-ink-900">{t('guest')}</legend>

        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <Input label={t('firstName')} name="firstName" required autoComplete="given-name" />
          <Input label={t('lastName')} name="lastName" required autoComplete="family-name" />
          <Input label={t('email')} name="email" type="email" required autoComplete="email" />
          <Input label={t('phone')} name="phoneNumber" type="tel" required autoComplete="tel" />
        </div>

        <Textarea label={t('message')} name="message" rows={5} className="mt-8" />
      </fieldset>

      {status === 'error' ? <p className="text-sm text-red-700">{t('error')}</p> : null}

      <Magnetic>
        <Button type="submit" disabled={status === 'sending' || nights === 0}>
          {status === 'sending' ? t('sending') : t('submit')}
        </Button>
      </Magnetic>
    </form>
  );
}
