/**
 * Translation between the Django payloads and the console's view types.
 *
 * A deliberate seam. The API speaks snake_case and returns money as strings
 * (Decimal, so no float rounding); the components want camelCase and numbers.
 * Doing that conversion in one place means a backend field rename touches this
 * file and nothing else — and it keeps the components free of `?? 0` guards
 * scattered through the JSX.
 *
 * Every `GAP:` note in `types/admin.ts` has now closed except where marked.
 */

import type {
  AdminReservation,
  AdminSuite,
  ConciergeKind,
  ConciergePriority,
  ConciergeRequest,
  ConciergeStatus,
  ExecutiveMetric,
  HousekeepingStatus,
  ReservationStatus,
  SuiteUnit,
} from '@/types/admin';

/* ---------------------------------------------------------- wire shapes -- */

export type WireReservation = {
  reference: string;
  full_name: string;
  email: string;
  phone_number: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  board: AdminReservation['board'];
  message: string;
  status: ReservationStatus;
  total_price: string | null;
  is_vip?: boolean;
  created_at: string;
  rooms: { room_slug: string; quantity: number; unit_price: string | null }[];
  assignments?: { unit_number: string; room_slug: string }[];
  payments?: { status: string; amount: string }[];
};

export type WireSuite = {
  slug: string;
  base_price: string | null;
  is_bookable: boolean;
  units: {
    id: number;
    number: string;
    housekeeping: HousekeepingStatus;
    is_sellable: boolean;
  }[];
  units_ready: number;
};

export type WireConcierge = {
  id: number;
  /** Django's `ConciergeRequest.Kind` verbatim — see KIND_MAP below. */
  kind: 'transport' | 'dining' | 'spa' | 'housekeeping' | 'technical' | 'other';
  priority: ConciergePriority;
  status: ConciergeStatus | 'cancelled';
  summary: string;
  unit_number: string | null;
  guest_reference: string | null;
  assigned_to_name: string | null;
  created_at: string;
};

export type WireOverview = {
  as_of: string;
  occupancy: { occupied: number; sellable: number; rate_pct: number };
  revenue_mtd?: { total: string; transactions: number };
  revenue_series?: { date: string; total: string }[];
  reservations: { active: number; pending: number; confirmed: number; checked_in: number };
  arrivals: { total: number; vip: number; pending: number };
  housekeeping: Partial<Record<HousekeepingStatus, number>>;
  concierge: { open: number; urgent: number; unassigned: number };
  adr_mtd?: string;
};

export type Paginated<T> = { count: number; next: string | null; results: T[] };

/* ------------------------------------------------------------- helpers -- */

/** Decimal strings arrive as strings on purpose; parse at the edge only. */
function money(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Normalises 0–1 for the sparkline, flat at 0.5 when every sample is equal. */
function normalise(values: number[]): number[] {
  if (values.length === 0) return [0, 0];
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((value) => (value - min) / (max - min));
}

const DZD = new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 0 });

function compactDzd(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M DZD`;
  if (amount >= 1_000) return `${Math.round(amount / 1000)}k DZD`;
  return `${DZD.format(amount)} DZD`;
}

/* ------------------------------------------------------------- mappers -- */

export function toReservation(wire: WireReservation): AdminReservation {
  const line = wire.rooms[0];
  const assignment = wire.assignments?.[0];

  return {
    reference: wire.reference,
    guestName: wire.full_name,
    email: wire.email,
    phone: wire.phone_number,
    checkIn: wire.check_in,
    checkOut: wire.check_out,
    nights: wire.nights,
    adults: wire.adults,
    children: wire.children,
    board: wire.board,
    status: wire.status,
    // The unit number when one is assigned, the room type otherwise — a
    // pending booking has no physical room yet.
    suite: assignment
      ? `${assignment.room_slug} · ${assignment.unit_number}`
      : (line?.room_slug ?? '—'),
    suiteSlug: line?.room_slug ?? '',
    totalDzd: money(wire.total_price),
    // GAP closed: Payment exists now, but the console only needs the coarse
    // state, so it is derived rather than surfaced field by field.
    paymentStatus: derivePaymentStatus(wire),
    isVip: wire.is_vip ?? false,
    specialRequest: wire.message,
    requestedAt: wire.created_at,
  };
}

function derivePaymentStatus(wire: WireReservation): AdminReservation['paymentStatus'] {
  const payments = wire.payments ?? [];
  if (payments.some((payment) => payment.status === 'refunded')) return 'refunded';

  const captured = payments
    .filter((payment) => payment.status === 'captured')
    .reduce((sum, payment) => sum + (money(payment.amount) ?? 0), 0);

  if (captured === 0) return 'unpaid';

  const total = money(wire.total_price) ?? 0;
  return total > 0 && captured >= total ? 'paid' : 'deposit_held';
}

/** Backend slugs carry no tier field, so the label is derived from the slug. */
function tierFor(slug: string): AdminSuite['tier'] {
  if (slug.includes('royale')) return 'Royale';
  if (slug.includes('executive')) return 'Executive';
  if (slug.includes('junior')) return 'Junior';
  return 'Standard';
}

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function toSuite(wire: WireSuite): AdminSuite {
  return {
    slug: wire.slug,
    name: titleCase(wire.slug),
    tier: tierFor(wire.slug),
    baseRateDzd: money(wire.base_price),
    // GAP still open: the rate calendar is per-date, and the console's single
    // "override" box has no date to send. Left null until the panel grows a
    // date picker; see RateOverride in the backend.
    rateOverrideDzd: null,
    isBookable: wire.is_bookable,
    units: wire.units.map((unit): SuiteUnit => ({
      id: String(unit.id),
      number: unit.number,
      status: unit.housekeeping,
    })),
  };
}

/**
 * Backend `Kind` values onto the view type.
 *
 * These sets are not identical and the difference is not cosmetic: Django emits
 * `technical` and `other`, the view type has `tech` and no `other`. Mapping them
 * implicitly is what produced a blank console — an unmapped key made the icon
 * lookup `undefined` and the exception took down every panel, not just the feed.
 */
const KIND_MAP: Record<WireConcierge['kind'], ConciergeKind> = {
  transport: 'transport',
  dining: 'dining',
  spa: 'spa',
  housekeeping: 'housekeeping',
  technical: 'tech',
  other: 'housekeeping',
};

export function toConciergeRequest(wire: WireConcierge): ConciergeRequest | null {
  // Cancelled requests have no place in an operational feed, and the view type
  // has no state for them.
  if (wire.status === 'cancelled') return null;

  return {
    id: String(wire.id),
    kind: KIND_MAP[wire.kind] ?? 'housekeeping',
    priority: wire.priority,
    status: wire.status,
    guestName: wire.assigned_to_name ?? wire.guest_reference ?? 'Guest',
    isVip: false, // not carried on the concierge payload
    suite: wire.unit_number ?? '—',
    summary: wire.summary,
    receivedAt: wire.created_at,
  };
}

export function toMetrics(wire: WireOverview): ExecutiveMetric[] {
  const metrics: ExecutiveMetric[] = [
    {
      id: 'occupancy',
      label: 'Occupancy rate',
      value: `${wire.occupancy.rate_pct}%`,
      caption: `${wire.occupancy.occupied} of ${wire.occupancy.sellable} units sold tonight`,
      deltaPct: null,
      riseIsGood: true,
      tone: 'gold',
      trend: normalise([wire.occupancy.occupied, wire.occupancy.occupied]),
    },
  ];

  // Revenue is absent for non-managers — the backend strips it, so the card is
  // simply not rendered rather than showing a zero that looks like bad trading.
  if (wire.revenue_mtd) {
    const series = (wire.revenue_series ?? []).map((point) => money(point.total) ?? 0);
    metrics.push({
      id: 'revenue',
      label: 'Revenue, month to date',
      value: compactDzd(money(wire.revenue_mtd.total) ?? 0),
      caption: `${wire.revenue_mtd.transactions} captured payment${
        wire.revenue_mtd.transactions === 1 ? '' : 's'
      }`,
      deltaPct: null,
      riseIsGood: true,
      tone: 'ok',
      trend: normalise(series.length > 1 ? series : [0, ...series]),
    });
  }

  metrics.push(
    {
      id: 'reservations',
      label: 'Active reservations',
      value: String(wire.reservations.active),
      caption: `${wire.reservations.pending} awaiting confirmation`,
      deltaPct: null,
      riseIsGood: true,
      tone: 'ice',
      trend: normalise([wire.reservations.confirmed, wire.reservations.active]),
    },
    {
      id: 'vip',
      label: 'VIP arrivals today',
      value: String(wire.arrivals.vip),
      caption: `${wire.arrivals.total} arrival${wire.arrivals.total === 1 ? '' : 's'} expected`,
      deltaPct: null,
      riseIsGood: true,
      tone: 'alert',
      trend: normalise([wire.arrivals.vip, wire.arrivals.total]),
    },
  );

  return metrics;
}
