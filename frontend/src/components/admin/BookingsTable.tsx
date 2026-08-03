'use client';

import { useEffect, useMemo, useState } from 'react';

import type { AdminReservation, ReservationFilter, ReservationStatus } from '@/types/admin';

/**
 * Live booking management.
 *
 * Presentational: the parent owns the data and passes async handlers that call
 * `POST /api/v1/admin/reservations/{reference}/confirm|check-in/`. Local state
 * exists only to paint the optimistic step, and rolls back on failure — a
 * status that flips and then quietly flips back is worse than a slow one.
 *
 * Layout note: below `lg` the table becomes a stack of cards rather than a
 * horizontally scrolling grid. A ten-column table on a 375px phone is a table
 * nobody can read, and the duty manager checking arrivals from the lobby is on
 * a phone.
 */

const FILTERS: { id: ReservationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'pending', label: 'Pending' },
  { id: 'vip', label: 'VIP' },
  { id: 'checked_in', label: 'Checked in' },
];

const STATUS_STYLE: Record<ReservationStatus, { cls: string; label: string }> = {
  confirmed: { cls: 'adm-badge-ok', label: 'Confirmed' },
  pending: { cls: 'adm-badge-warn', label: 'Pending' },
  checked_in: { cls: 'adm-badge-info', label: 'Checked in' },
  checked_out: { cls: 'adm-badge-neutral', label: 'Checked out' },
  cancelled: { cls: 'adm-badge-alert', label: 'Cancelled' },
};

const BOARD_LABEL: Record<AdminReservation['board'], string> = {
  room_only: 'Room only',
  bb: 'B&B',
  hb: 'Half board',
  fb: 'Full board',
};

const dzd = new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 0 });

/** `2026-08-03` → `3 Aug`. Split rather than parsed: `new Date('2026-08-03')`
    is UTC midnight and renders as 2 August anywhere west of Greenwich. */
function shortDate(iso: string): string {
  const [, month, day] = iso.split('-').map(Number);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${day} ${months[month - 1] ?? ''}`;
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  const { cls, label } = STATUS_STYLE[status];
  return <span className={`adm-badge ${cls}`}>{label}</span>;
}

function RowActions({
  reservation,
  onApprove,
  onCheckIn,
  busy,
}: {
  reservation: AdminReservation;
  onApprove: (reference: string) => void;
  onCheckIn: (reference: string) => void;
  busy: boolean;
}) {
  const { status, reference, guestName } = reservation;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {status === 'pending' ? (
        <button
          type="button"
          className="adm-btn adm-btn-gold"
          onClick={() => onApprove(reference)}
          disabled={busy}
        >
          Approve
          {/* The visible label says "Approve" on eight rows; the accessible
              name has to say which one. */}
          <span className="sr-only">
            {' '}
            reservation {reference} for {guestName}
          </span>
        </button>
      ) : null}

      {status === 'confirmed' ? (
        <button type="button" className="adm-btn" onClick={() => onCheckIn(reference)}>
          Check in
          <span className="sr-only">
            {' '}
            {guestName}, reservation {reference}
          </span>
        </button>
      ) : null}

      <button type="button" className="adm-btn">
        Modify
        <span className="sr-only">
          {' '}
          reservation {reference} for {guestName}
        </span>
      </button>
    </div>
  );
}

export function BookingsTable({
  initial,
  onApprove,
  onCheckIn,
}: {
  initial: AdminReservation[];
  /** Omit for a fixture-only build; the table then mutates locally. */
  onApprove?: (reference: string) => Promise<void>;
  onCheckIn?: (reference: string) => Promise<void>;
}) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<ReservationFilter>('all');
  const [query, setQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // The parent refetches after every mutation, so `initial` is the source of
  // truth; local state exists only to paint the optimistic step in between.
  useEffect(() => setRows(initial), [initial]);

  const mutate = async (
    reference: string,
    next: ReservationStatus,
    remote: ((reference: string) => Promise<void>) | undefined,
    verb: string,
  ) => {
    const snapshot = rows;
    setRows((current) =>
      current.map((row) => (row.reference === reference ? { ...row, status: next } : row)),
    );
    setAnnouncement(`Reservation ${reference} ${verb}.`);

    if (!remote) return;

    setBusy(reference);
    try {
      await remote(reference);
    } catch (cause) {
      // Roll back to exactly what was on screen before, and say why.
      setRows(snapshot);
      setAnnouncement(
        cause instanceof Error
          ? `Could not update ${reference}: ${cause.message}`
          : 'Update failed.',
      );
    } finally {
      setBusy(null);
    }
  };

  const approve = (reference: string) => mutate(reference, 'confirmed', onApprove, 'confirmed');

  const checkIn = (reference: string) => mutate(reference, 'checked_in', onCheckIn, 'checked in');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesFilter =
        filter === 'all' || (filter === 'vip' ? row.isVip : row.status === filter);

      if (!matchesFilter) return false;
      if (!needle) return true;

      return (
        row.guestName.toLowerCase().includes(needle) ||
        row.reference.toLowerCase().includes(needle) ||
        row.suite.toLowerCase().includes(needle)
      );
    });
  }, [rows, filter, query]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      confirmed: rows.filter((r) => r.status === 'confirmed').length,
      pending: rows.filter((r) => r.status === 'pending').length,
      vip: rows.filter((r) => r.isVip).length,
      checked_in: rows.filter((r) => r.status === 'checked_in').length,
    }),
    [rows],
  );

  return (
    <section className="adm-glass adm-enter overflow-hidden" aria-labelledby="bookings-heading">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--adm-line)] p-5">
        <div>
          <p className="adm-eyebrow">Live bookings</p>
          <h2 id="bookings-heading" className="mt-1.5 text-lg text-[var(--adm-text)]">
            Reservation management
          </h2>
        </div>

        <label className="w-full sm:w-64">
          <span className="sr-only">Search reservations by guest, reference or suite</span>
          <input
            type="search"
            className="adm-input"
            placeholder="Search guest, ref or suite…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-[var(--adm-line)] p-5">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="adm-chip"
            // `aria-pressed` rather than a roving tablist: these are toggles
            // over one list, not navigation between separate panels.
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
            <span className="ms-1.5 opacity-60">{counts[item.id]}</span>
          </button>
        ))}
      </div>

      {/* Mutations are announced once, politely — a manager approving a booking
          with a screen reader gets confirmation without the table re-reading. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {visible.length === 0 ? (
        <p className="p-10 text-center text-sm text-[var(--adm-muted)]">
          No reservations match this filter.
        </p>
      ) : (
        <>
          {/* Desktop: real table semantics. */}
          <div className="adm-scroll-x hidden lg:block">
            <table className="adm-table">
              <caption className="sr-only">
                Reservations, filtered by {FILTERS.find((f) => f.id === filter)?.label}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Guest</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Suite</th>
                  <th scope="col">Stay</th>
                  <th scope="col">Guests</th>
                  <th scope="col">Board</th>
                  <th scope="col">Total</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.reference}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--adm-text)]">{row.guestName}</span>
                        {row.isVip ? <span className="adm-badge adm-badge-vip">VIP</span> : null}
                      </div>
                      <span className="text-xs text-[var(--adm-muted)]">{row.email}</span>
                    </td>
                    <td className="text-[var(--adm-dim)]">{row.reference}</td>
                    <td className="text-[var(--adm-dim)]">{row.suite}</td>
                    <td className="whitespace-nowrap text-[var(--adm-dim)]">
                      {shortDate(row.checkIn)} → {shortDate(row.checkOut)}
                      <span className="block text-xs text-[var(--adm-muted)]">
                        {row.nights} {row.nights === 1 ? 'night' : 'nights'}
                      </span>
                    </td>
                    <td className="text-[var(--adm-dim)]">
                      {row.adults}
                      {row.children > 0 ? ` + ${row.children}` : ''}
                    </td>
                    <td className="text-[var(--adm-dim)]">{BOARD_LABEL[row.board]}</td>
                    <td className="whitespace-nowrap text-[var(--adm-text)]">
                      {row.totalDzd === null ? '—' : `${dzd.format(row.totalDzd)} DZD`}
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>
                      <RowActions
                        reservation={row}
                        onApprove={approve}
                        onCheckIn={checkIn}
                        busy={busy === row.reference}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: the same rows as cards. */}
          <ul className="divide-y divide-white/5 lg:hidden">
            {visible.map((row) => (
              <li key={row.reference} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[var(--adm-text)]">{row.guestName}</span>
                      {row.isVip ? <span className="adm-badge adm-badge-vip">VIP</span> : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--adm-muted)]">
                      {row.reference} · {row.suite}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="adm-label">Stay</dt>
                    <dd className="mt-1 text-[var(--adm-dim)]">
                      {shortDate(row.checkIn)} → {shortDate(row.checkOut)} · {row.nights}n
                    </dd>
                  </div>
                  <div>
                    <dt className="adm-label">Guests</dt>
                    <dd className="mt-1 text-[var(--adm-dim)]">
                      {row.adults}
                      {row.children > 0 ? ` + ${row.children}` : ''} · {BOARD_LABEL[row.board]}
                    </dd>
                  </div>
                  <div>
                    <dt className="adm-label">Total</dt>
                    <dd className="mt-1 text-[var(--adm-text)]">
                      {row.totalDzd === null ? '—' : `${dzd.format(row.totalDzd)} DZD`}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <RowActions
                    reservation={row}
                    onApprove={approve}
                    onCheckIn={checkIn}
                    busy={busy === row.reference}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
