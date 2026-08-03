/**
 * Domain types for the admin console.
 *
 * These are written against the API the console *needs*, not the API that
 * exists today. Anything the current Django models cannot supply is marked
 * `GAP:` with the app that would have to grow the field. That annotation is
 * the working list for the backend build — the console is the specification.
 *
 * Fields with no marker already exist in `backend/apps/*` and map one to one.
 */

/* ------------------------------------------------------------ reservations -- */

/**
 * `pending | confirmed | cancelled` exist on `reservations.Reservation.Status`.
 *
 * GAP (reservations): `checked_in` and `checked_out` do not. The console needs
 * them for the arrivals board and the occupancy figure — an occupancy rate
 * computed from confirmed bookings alone counts guests who never turned up.
 */
export type ReservationStatus =
  'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';

/** Matches `reservations.Reservation.Board`. */
export type BoardType = 'room_only' | 'bb' | 'hb' | 'fb';

/**
 * GAP (payments): there is no payment model at all. Reservations are enquiries
 * today — the hotel confirms by phone. A real booking engine needs at minimum a
 * captured/authorised/refunded lifecycle before the console can claim to show
 * revenue rather than requested value.
 */
export type PaymentStatus = 'unpaid' | 'deposit_held' | 'paid' | 'refunded';

export type AdminReservation = {
  /** `reference` — the human-facing code, unique and non-editable. */
  reference: string;
  guestName: string;
  email: string;
  phone: string;
  /** `YYYY-MM-DD`. Deliberately strings: these are calendar dates, and putting
      them through a Date turns a stay into a timezone bug. */
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  board: BoardType;
  status: ReservationStatus;
  /** `ReservationRoom` rows, flattened for display. */
  suite: string;
  suiteSlug: string;
  /** GAP (payments): derived from a Payment model that does not exist. */
  totalDzd: number | null;
  paymentStatus: PaymentStatus;
  /** GAP (accounts): requires a Guest profile with a VIP tier. */
  isVip: boolean;
  /** `message` on the reservation. */
  specialRequest: string;
  /** `created_at`, ISO 8601. */
  requestedAt: string;
};

/** The filters the console exposes. `all` is not a status, it is the absence
    of one — kept in the same union so the chip row stays a single control. */
export type ReservationFilter = 'all' | 'confirmed' | 'pending' | 'vip' | 'checked_in';

/* ------------------------------------------------------------------ suites -- */

/**
 * GAP (rooms): housekeeping state does not exist. `rooms.Room` carries
 * `total_units` as a bare integer, so the system knows a category has six units
 * but nothing about any individual room. Per-unit state needs a `RoomUnit`
 * model — see the Step 2 schema.
 */
export type HousekeepingStatus = 'clean' | 'occupied' | 'dirty' | 'maintenance';

export type SuiteUnit = {
  /** Door number, e.g. "401". */
  id: string;
  number: string;
  status: HousekeepingStatus;
};

export type AdminSuite = {
  /** `rooms.Room.slug`. */
  slug: string;
  name: string;
  /** GAP (rooms): no tier field. Categories are ordered by `position` only. */
  tier: 'Standard' | 'Junior' | 'Executive' | 'Royale';
  /** `base_price`, DZD. Null means "on request", which the public site honours. */
  baseRateDzd: number | null;
  /**
   * GAP (pricing): a nightly override needs a rate calendar keyed by
   * (room, date). A single mutable number on the room would silently rewrite
   * the rate for every future booking, including ones already quoted.
   */
  rateOverrideDzd: number | null;
  /** GAP (rooms): no bookable flag; `is_published` controls visibility, which
      is not the same thing as being available to sell. */
  isBookable: boolean;
  units: SuiteUnit[];
};

/* --------------------------------------------------------------- concierge -- */

/**
 * GAP (concierge): the whole feature is absent. The closest existing model is
 * `contact.ContactMessage`, which is a website enquiry form, not an in-stay
 * request queue.
 *
 * `transport` and `dining` map to services the hotel actually runs (the shuttle
 * and El Mayda). `spa` maps to the wellness centre. `housekeeping` and `tech`
 * are operational categories with no public service behind them.
 */
export type ConciergeKind = 'transport' | 'dining' | 'spa' | 'housekeeping' | 'tech';

export type ConciergePriority = 'urgent' | 'high' | 'normal';

export type ConciergeStatus = 'new' | 'in_progress' | 'resolved';

export type ConciergeRequest = {
  id: string;
  kind: ConciergeKind;
  priority: ConciergePriority;
  status: ConciergeStatus;
  guestName: string;
  /** GAP (accounts): VIP tier again. */
  isVip: boolean;
  suite: string;
  summary: string;
  /** ISO 8601. Rendered as a relative age. */
  receivedAt: string;
};

/* ----------------------------------------------------------------- metrics -- */

export type MetricTone = 'gold' | 'ice' | 'ok' | 'alert';

export type ExecutiveMetric = {
  id: string;
  label: string;
  value: string;
  /** Short qualifier under the figure, e.g. "of 48 units". */
  caption: string;
  /** Percentage change against the previous period; null hides the delta. */
  deltaPct: number | null;
  /** Whether a rise is good. Occupancy up is good, cancellations up is not. */
  riseIsGood: boolean;
  tone: MetricTone;
  /** Normalised 0–1 samples for the sparkline. */
  trend: number[];
};
