# Backend architecture — schema and API map

Scope: everything the public site and the admin console at `/admin` need in order
to run on real data.

---

## 1. Baseline — what actually exists today

This is not a greenfield design. `backend/` is a Django 5 + DRF project with
eight domain apps, and the audit below is what is genuinely in place.

| Layer | Status |
|---|---|
| Models + migrations | **Done** — 8 apps, translation tables, publish/order mixins, DB check constraints |
| URL skeletons | **Done** — routers wired under `/api/v1/` |
| Pagination, spectacular schema, CORS, throttle scopes | **Done** |
| Serializers, views, selectors, services, filters, admin | **Stub** — 59 files containing only `# TODO: implement.` |
| Tests | **Stub** |
| Authentication / users / roles | **Absent** — no `AUTH_USER_MODEL`, no JWT, `DEFAULT_PERMISSION_CLASSES = AllowAny` |

The frontend currently reads from `frontend/src/content/*.ts`, not from the API.

**So the honest summary is: the schema is largely built, the behaviour is not
started.** What follows is therefore split into *extend the schema* and *build
the behaviour*, rather than presented as a fresh design.

### Two decisions worth making explicitly

**Django, not Prisma.** The request asked for Prisma or MongoDB. Adopting either
means discarding a working, migrated, i18n-aware schema and re-implementing it —
for no functional gain, since Prisma and Django both target PostgreSQL. The
Django models below are primary. A Prisma translation is in §4 for reference, or
in case the backend is being reconsidered wholesale; it is not a recommendation.

**`total_units` is the biggest schema gap.** `rooms.Room` tracks stock as a
single integer. The console needs per-room housekeeping state, and the booking
engine needs to know *which* physical room is occupied to prevent double-selling.
That requires a `RoomUnit` table, and it is the change everything else hangs off.

---

## 2. Schema — what exists, mapped to what the console needs

### 2.1 Already modelled

| Console need | Existing model | Notes |
|---|---|---|
| Suite categories, rates | `rooms.Room` | `base_price` nullable = "on request" |
| Suite copy per locale | `rooms.RoomTranslation` | |
| Suite specs, photography | `rooms.RoomSpecification`, `rooms.RoomImage` | |
| Reservations | `reservations.Reservation` | Has a `check_out > check_in` DB constraint |
| Rooms on a reservation | `reservations.ReservationRoom` | Captures `unit_price` at request time — good |
| Reviews + moderation | `reviews.Review` | `pending/approved/rejected` |
| Restaurants, spa, halls | `services.Service`, `services.EventHall` | |
| Enquiries | `contact.ContactMessage` | Website form, *not* an in-stay request queue |

### 2.2 New models required

Every field the console needs and the backend cannot supply is annotated `GAP:`
in `frontend/src/types/admin.ts`. Consolidated:

#### `apps/accounts` — new

```python
class User(AbstractUser):
    """Custom from day one. Swapping AUTH_USER_MODEL after the first migration
    is a documented migration nightmare, and this project has not shipped yet —
    this is the last cheap moment to do it."""

    class Role(models.TextChoices):
        GUEST = "guest", _("Guest")
        STAFF = "staff", _("Staff")          # concierge, housekeeping, front desk
        MANAGER = "manager", _("Manager")    # rates, inventory, refunds
        ADMIN = "admin", _("Administrator")  # user management, audit

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.GUEST, db_index=True)
    phone_number = models.CharField(max_length=32, blank=True)
    preferred_language = models.CharField(max_length=5, default="fr")
    # Django's built-in `is_staff` governs the /admin/ Django site only. Keep the
    # two separate: API authorisation must not be a side effect of Django admin access.


class GuestProfile(TimeStampedModel):
    """One per guest. Separate from User so staff accounts carry no guest fields."""

    class VipTier(models.TextChoices):
        NONE = "none", _("Standard")
        SILVER = "silver", _("Silver")
        GOLD = "gold", _("Gold")
        PLATINUM = "platinum", _("Platinum")

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="guest_profile")
    vip_tier = models.CharField(max_length=20, choices=VipTier.choices, default=VipTier.NONE, db_index=True)
    nationality = models.CharField(max_length=2, blank=True)  # ISO 3166-1 alpha-2
    date_of_birth = models.DateField(null=True, blank=True)
    dietary_notes = models.TextField(blank=True)
    accessibility_notes = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True, help_text=_("Staff-visible only. Never serialised to a guest-facing endpoint."))
    marketing_opt_in = models.BooleanField(default=False)
```

> `internal_notes` and `dietary_notes` are special-category-adjacent personal
> data. They need a serializer that is never reachable from a guest-authenticated
> route, and a retention policy — not just a permission class.

#### `apps/rooms` — extend

```python
class RoomUnit(TimeStampedModel):
    """A physical room. This is what `Room.total_units` should have been."""

    class Housekeeping(models.TextChoices):
        CLEAN = "clean", _("Clean")
        OCCUPIED = "occupied", _("Occupied")
        DIRTY = "dirty", _("Dirty")
        MAINTENANCE = "maintenance", _("Out of order")

    room = models.ForeignKey(Room, related_name="units", on_delete=models.PROTECT)
    number = models.CharField(max_length=10)            # "401"
    floor = models.PositiveSmallIntegerField(null=True, blank=True)
    housekeeping = models.CharField(max_length=20, choices=Housekeeping.choices,
                                    default=Housekeeping.CLEAN, db_index=True)
    is_sellable = models.BooleanField(default=True, db_index=True,
        help_text=_("False takes the unit out of inventory without deleting its history."))
    notes = models.TextField(blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["room", "number"], name="unique_unit_per_room")]
        ordering = ("room", "number")


class RateOverride(TimeStampedModel):
    """A dated exception to Room.base_price.

    Deliberately not a mutable column on Room: overwriting the base rate would
    silently reprice every future booking, including quotes already given. An
    override is layered on at quote time and leaves history intact."""

    room = models.ForeignKey(Room, related_name="rate_overrides", on_delete=models.CASCADE)
    date = models.DateField(db_index=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.CharField(max_length=120, blank=True)
    created_by = models.ForeignKey("accounts.User", null=True, on_delete=models.SET_NULL)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["room", "date"], name="one_override_per_room_per_night")]


class RoomClosure(TimeStampedModel):
    """Stop-sell for a category over a date range — the console's availability toggle."""
    room = models.ForeignKey(Room, related_name="closures", on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.CharField(max_length=200, blank=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(end_date__gte=models.F("start_date")),
                                              name="closure_end_after_start")]
```

#### `apps/reservations` — extend

```python
# Reservation.Status gains:
CHECKED_IN = "checked_in", _("Checked in")
CHECKED_OUT = "checked_out", _("Checked out")
NO_SHOW = "no_show", _("No show")

# Reservation gains:
guest = models.ForeignKey("accounts.User", null=True, blank=True,
                          related_name="reservations", on_delete=models.SET_NULL)
# Nullable on purpose: the hotel takes bookings by phone for people with no account.
source = models.CharField(max_length=20, choices=[("web", "Website"), ("phone", "Phone"),
                                                  ("walk_in", "Walk-in"), ("ota", "OTA")], default="web")
total_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
cancelled_at = models.DateTimeField(null=True, blank=True)
cancellation_reason = models.TextField(blank=True)


class RoomAssignment(TimeStampedModel):
    """Binds a reservation to a physical unit for a date range.

    This is the table the availability query actually reads. Without it,
    'is room 401 free next Tuesday' is unanswerable."""

    reservation = models.ForeignKey(Reservation, related_name="assignments", on_delete=models.CASCADE)
    unit = models.ForeignKey("rooms.RoomUnit", related_name="assignments", on_delete=models.PROTECT)
    start_date = models.DateField()
    end_date = models.DateField()

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(end_date__gt=models.F("start_date")),
                                   name="assignment_end_after_start"),
            # PostgreSQL exclusion constraint — the database refuses to hold two
            # overlapping stays for one unit. Application-level checks race under
            # concurrency; this one cannot be lost to a race.
            ExclusionConstraint(
                name="no_double_booked_unit",
                expressions=[("unit", RangeOperators.EQUAL),
                             (DateRange("start_date", "end_date", RangeBoundary.INCLUSIVE_EXCLUSIVE),
                              RangeOperators.OVERLAPS)],
            ),
        ]


class Payment(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        AUTHORISED = "authorised", _("Authorised")
        CAPTURED = "captured", _("Captured")
        REFUNDED = "refunded", _("Refunded")
        FAILED = "failed", _("Failed")

    reservation = models.ForeignKey(Reservation, related_name="payments", on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="DZD")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    method = models.CharField(max_length=30, blank=True)   # cib, edahabia, cash, transfer
    provider_reference = models.CharField(max_length=120, blank=True)
    # No card numbers, ever. Store the provider's token and nothing else — PCI
    # scope is something to stay outside of, not to manage.
```

> `ExclusionConstraint` needs `btree_gist`. Add a migration running
> `CREATE EXTENSION IF NOT EXISTS btree_gist;` before it.

#### `apps/concierge` — new

```python
class ConciergeRequest(TimeStampedModel):
    class Kind(models.TextChoices):
        TRANSPORT = "transport", _("Transport")
        DINING = "dining", _("Dining")
        SPA = "spa", _("Spa and wellness")
        HOUSEKEEPING = "housekeeping", _("Housekeeping")
        TECHNICAL = "technical", _("Technical")
        OTHER = "other", _("Other")

    class Priority(models.TextChoices):
        URGENT = "urgent", _("Urgent")
        HIGH = "high", _("High")
        NORMAL = "normal", _("Normal")

    class Status(models.TextChoices):
        NEW = "new", _("New")
        IN_PROGRESS = "in_progress", _("In progress")
        RESOLVED = "resolved", _("Resolved")
        CANCELLED = "cancelled", _("Cancelled")

    reservation = models.ForeignKey("reservations.Reservation", related_name="concierge_requests",
                                    null=True, blank=True, on_delete=models.SET_NULL)
    unit = models.ForeignKey("rooms.RoomUnit", null=True, blank=True, on_delete=models.SET_NULL)
    kind = models.CharField(max_length=20, choices=Kind.choices, db_index=True)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW, db_index=True)
    summary = models.CharField(max_length=300)
    detail = models.TextField(blank=True)
    requested_for = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ForeignKey("accounts.User", null=True, blank=True,
                                    related_name="assigned_requests", on_delete=models.SET_NULL)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        # Urgent first, then oldest first inside a band. A newest-first queue
        # buries the request that has been waiting longest.
        ordering = ("priority", "created_at")
        indexes = [models.Index(fields=["status", "priority", "created_at"])]


class ExperienceBooking(TimeStampedModel):
    """Spa treatments, restaurant covers, transfers — a booking against a Service."""
    service = models.ForeignKey("services.Service", related_name="bookings", on_delete=models.PROTECT)
    reservation = models.ForeignKey("reservations.Reservation", null=True, blank=True,
                                    related_name="experience_bookings", on_delete=models.SET_NULL)
    guest_name = models.CharField(max_length=150)
    starts_at = models.DateTimeField(db_index=True)
    duration_minutes = models.PositiveSmallIntegerField(default=60)
    party_size = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(max_length=20, default="requested")
    notes = models.TextField(blank=True)
```

#### `apps/audit` — new

```python
class AuditLog(models.Model):
    """Append-only. Who changed what, when, from where.

    Not optional for a system where staff can alter prices and cancel paid
    bookings — a refund with no attribution is indistinguishable from theft."""

    actor = models.ForeignKey("accounts.User", null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=60, db_index=True)   # reservation.confirm, rate.override
    target_type = models.CharField(max_length=60)
    target_id = models.CharField(max_length=60)
    changes = models.JSONField(default=dict)                  # {"field": [before, after]}
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=["target_type", "target_id"])]
```

---

## 3. API and function map

### 3.1 Auth and RBAC

`djangorestframework-simplejwt`, access + refresh, refresh in an httpOnly cookie
so a stolen access token expires in minutes and XSS cannot read the refresh.

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/v1/auth/register/` | Guests only. Never accepts `role` from the body |
| POST | `/api/v1/auth/login/` | Returns access; sets refresh cookie |
| POST | `/api/v1/auth/refresh/` | Rotate + blacklist the used token |
| POST | `/api/v1/auth/logout/` | Blacklist and clear cookie |
| GET/PATCH | `/api/v1/auth/me/` | Own profile only |
| POST | `/api/v1/auth/password/reset/` | Always 204, even for unknown addresses — a differing response is an account-enumeration oracle |

Permission classes to fill into the empty `apps/common/permissions.py`:

```python
IsStaff            # role in {staff, manager, admin}
IsManager          # role in {manager, admin}
IsAdmin            # role == admin
IsOwnerOrStaff     # obj.guest == request.user, or staff
ReadOnlyOrStaff    # SAFE_METHODS public, writes staff-only
```

Flip `DEFAULT_PERMISSION_CLASSES` to `IsAuthenticated` and opt public endpoints
out explicitly. Defaulting open and remembering to close each route is how
endpoints leak.

### 3.2 Booking engine

The whole engine rests on one predicate. Stays are **half-open** intervals —
checkout day is free for the next guest:

```
overlap(a, b)  ⇔  a.start < b.end  AND  a.end > b.start
```

```python
# apps/rooms/selectors.py
def available_units(*, room, check_in, check_out):
    """Units of `room` free for the whole range."""
    taken = RoomAssignment.objects.filter(
        unit__room=room,
        start_date__lt=check_out,     # ← the predicate above
        end_date__gt=check_in,
        reservation__status__in=ACTIVE_STATUSES,
    ).values("unit_id")

    closed = RoomClosure.objects.filter(room=room, start_date__lt=check_out, end_date__gt=check_in)

    return (RoomUnit.objects
            .filter(room=room, is_sellable=True)
            .exclude(housekeeping=RoomUnit.Housekeeping.MAINTENANCE)
            .exclude(id__in=taken)
            .exclude(id__in=[] if not closed.exists() else RoomUnit.objects.filter(room=room)))

def availability_calendar(*, check_in, check_out, adults, children): ...
```

```python
# apps/reservations/services.py
def quote(*, room, check_in, check_out, board) -> Decimal:
    """Sum per-night, applying RateOverride where present.

    Never `nights * base_price`: that is wrong the moment a single night in the
    range carries an override, and wrong for the whole stay if the rate changes
    mid-stay."""

def create_reservation(*, payload, actor=None) -> Reservation:
    """
    1. Validate dates (check_out > check_in, check_in >= today, max stay length)
    2. SELECT ... FOR UPDATE on candidate units      ← closes the double-book race
    3. Re-check availability inside the transaction
    4. Price via quote()
    5. Create Reservation + ReservationRoom + RoomAssignment
    6. Generate reference (collision-retry)
    7. Enqueue confirmation email — outside the transaction, so a mail failure
       cannot roll back a paid booking
    """

def confirm_reservation(*, reservation, actor): ...
def cancel_reservation(*, reservation, actor, reason): ...   # frees assignments, triggers refund
def check_in(*, reservation, actor): ...                     # units -> occupied
def check_out(*, reservation, actor): ...                    # units -> dirty
```

Two failure modes worth naming, because both are silent:

- **The last-room race.** Two requests pass an availability check simultaneously
  and both write. The `ExclusionConstraint` makes the database the referee, so
  the loser gets an `IntegrityError` to convert into a clean 409 rather than a
  double-booked suite discovered at check-in.
- **Timezone drift.** `check_in`/`check_out` are `DateField`, and must stay that
  way. Anything that converts them through a datetime will move a stay by a day
  for guests west of Greenwich.

### 3.3 Public endpoints (the existing stubs)

| Method | Endpoint | Auth |
|---|---|---|
| GET | `/api/v1/rooms/`, `/rooms/{slug}/` | Public |
| GET | `/api/v1/rooms/availability/?check_in&check_out&adults` | Public, throttled |
| GET | `/api/v1/services/`, `/services/{slug}/`, `/services/halls/` | Public |
| GET | `/api/v1/gallery/`, `/gallery/categories/` | Public |
| GET | `/api/v1/blog/`, `/blog/{slug}/` | Public |
| POST | `/api/v1/reservations/` | Public, `reservation` throttle (10/h) |
| GET | `/api/v1/reservations/{reference}/` | Reference + email, or owner |
| GET/POST | `/api/v1/reviews/` | GET approved only; POST throttled (3/h), lands `pending` |
| POST | `/api/v1/contact/` | Public, throttled (5/h) |

### 3.4 Admin endpoints — one per console control

Each maps to a specific control in `/admin`.

| Console section | Method | Endpoint | Role |
|---|---|---|---|
| Executive stats | GET | `/api/v1/admin/analytics/overview/?date=` | Staff |
| — occupancy series | GET | `/api/v1/admin/analytics/occupancy/?from&to` | Staff |
| — revenue series | GET | `/api/v1/admin/analytics/revenue/?from&to` | Manager |
| Bookings table | GET | `/api/v1/admin/reservations/?status&vip&q&from&to` | Staff |
| Approve | POST | `/api/v1/admin/reservations/{ref}/confirm/` | Staff |
| Modify | PATCH | `/api/v1/admin/reservations/{ref}/` | Manager |
| Check in / out | POST | `/api/v1/admin/reservations/{ref}/check-in/` · `/check-out/` | Staff |
| Cancel | POST | `/api/v1/admin/reservations/{ref}/cancel/` | Manager |
| Assign a unit | POST | `/api/v1/admin/reservations/{ref}/assign/` | Staff |
| Suite availability toggle | POST | `/api/v1/admin/rooms/{slug}/closures/` · DELETE `/closures/{id}/` | Manager |
| Rate override | PUT | `/api/v1/admin/rooms/{slug}/rates/{date}/` | Manager |
| Housekeeping status | PATCH | `/api/v1/admin/units/{id}/` | Staff |
| Concierge feed | GET | `/api/v1/admin/concierge/?status&priority` | Staff |
| Advance a request | PATCH | `/api/v1/admin/concierge/{id}/` | Staff |
| Audit trail | GET | `/api/v1/admin/audit/?target_type&target_id` | Admin |

Analytics belongs in `apps/analytics/selectors.py` as database aggregates, not
Python loops over querysets:

```python
def occupancy_for(date) -> dict:
    """occupied units / sellable units. Counts assignments overlapping `date`,
    not confirmed reservations — a confirmed no-show is not an occupied room."""

def revenue_between(start, end) -> dict:
    """Sum of CAPTURED payments. Not reservation totals: a booking is not
    revenue until the money has actually moved."""
```

### 3.5 Live feed

The console renders the concierge queue as "live". Three options, in order of
what this project should do:

1. **Poll `/admin/concierge/` every 15 s** while the tab is focused. Trivial,
   works through every proxy, and 15 s is well inside human response time for a
   towel request.
2. **SSE** (`/admin/stream/`) if polling proves too coarse. One-way, plain HTTP,
   auto-reconnects.
3. **WebSockets** (Channels + Redis) only if two-way messaging is genuinely
   needed. It is a deployment dependency, not a free upgrade.

---

## 4. Prisma translation (reference only)

Provided because it was requested. Adopting it means replacing the Django
backend; §1 explains why that is not recommended.

```prisma
enum Role { GUEST STAFF MANAGER ADMIN }
enum VipTier { NONE SILVER GOLD PLATINUM }
enum ReservationStatus { PENDING CONFIRMED CHECKED_IN CHECKED_OUT CANCELLED NO_SHOW }
enum Housekeeping { CLEAN OCCUPIED DIRTY MAINTENANCE }
enum PaymentStatus { PENDING AUTHORISED CAPTURED REFUNDED FAILED }
enum ConciergeKind { TRANSPORT DINING SPA HOUSEKEEPING TECHNICAL OTHER }
enum ConciergeStatus { NEW IN_PROGRESS RESOLVED CANCELLED }

model User {
  id           String        @id @default(cuid())
  email        String        @unique
  passwordHash String
  role         Role          @default(GUEST)
  phoneNumber  String?
  guestProfile GuestProfile?
  reservations Reservation[]
  auditLogs    AuditLog[]
  createdAt    DateTime      @default(now())
}

model GuestProfile {
  id            String  @id @default(cuid())
  user          User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId        String  @unique
  vipTier       VipTier @default(NONE)
  dietaryNotes  String?
  internalNotes String?
}

model Room {
  slug        String          @id
  basePrice   Decimal?        @db.Decimal(10, 2)
  maxAdults   Int             @default(2)
  isPublished Boolean         @default(true)
  units       RoomUnit[]
  overrides   RateOverride[]
  closures    RoomClosure[]
  translations RoomTranslation[]
}

model RoomUnit {
  id           String           @id @default(cuid())
  room         Room             @relation(fields: [roomSlug], references: [slug])
  roomSlug     String
  number       String
  housekeeping Housekeeping     @default(CLEAN)
  isSellable   Boolean          @default(true)
  assignments  RoomAssignment[]
  @@unique([roomSlug, number])
}

model RateOverride {
  id       String   @id @default(cuid())
  room     Room     @relation(fields: [roomSlug], references: [slug])
  roomSlug String
  date     DateTime @db.Date
  price    Decimal  @db.Decimal(10, 2)
  @@unique([roomSlug, date])
}

model Reservation {
  id          String            @id @default(cuid())
  reference   String            @unique
  guest       User?             @relation(fields: [guestId], references: [id])
  guestId     String?
  firstName   String
  lastName    String
  email       String
  checkIn     DateTime          @db.Date
  checkOut    DateTime          @db.Date
  adults      Int               @default(1)
  children    Int               @default(0)
  status      ReservationStatus @default(PENDING)
  totalPrice  Decimal?          @db.Decimal(12, 2)
  assignments RoomAssignment[]
  payments    Payment[]
  requests    ConciergeRequest[]
  createdAt   DateTime          @default(now())
  @@index([status, checkIn])
}

model RoomAssignment {
  id            String      @id @default(cuid())
  reservation   Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  reservationId String
  unit          RoomUnit    @relation(fields: [unitId], references: [id])
  unitId        String
  startDate     DateTime    @db.Date
  endDate       DateTime    @db.Date
  @@index([unitId, startDate, endDate])
  // Prisma cannot express a GiST exclusion constraint. It has to be added by
  // raw SQL in a migration — without it, nothing stops a double booking.
}

model Payment {
  id                String        @id @default(cuid())
  reservation       Reservation   @relation(fields: [reservationId], references: [id])
  reservationId     String
  amount            Decimal       @db.Decimal(12, 2)
  currency          String        @default("DZD")
  status            PaymentStatus @default(PENDING)
  providerReference String?
}

model ConciergeRequest {
  id            String          @id @default(cuid())
  reservation   Reservation?    @relation(fields: [reservationId], references: [id])
  reservationId String?
  kind          ConciergeKind
  status        ConciergeStatus @default(NEW)
  priority      String          @default("normal")
  summary       String
  createdAt     DateTime        @default(now())
  @@index([status, priority, createdAt])
}

model AuditLog {
  id         String   @id @default(cuid())
  actor      User?    @relation(fields: [actorId], references: [id])
  actorId    String?
  action     String
  targetType String
  targetId   String
  changes    Json
  createdAt  DateTime @default(now())
  @@index([targetType, targetId])
}
```

---

## 5. Suggested order of work

1. `apps/accounts` + JWT + permission classes, and flip the default to
   `IsAuthenticated`. Everything else is gated on this, and the console is
   currently protected only by an env flag.
2. `RoomUnit` + `RoomAssignment` + the exclusion constraint. Backfill units from
   `Room.total_units`.
3. Fill the public read stubs (rooms, services, gallery, blog) — unblocks the
   frontend's move off static content.
4. Booking engine: `available_units`, `quote`, `create_reservation`.
5. Admin endpoints per §3.4, console section by console section.
6. `Payment`, then revenue analytics. Not before — revenue from unpaid
   reservations is a vanity figure.
7. `apps/concierge`, then swap the console's fixtures for polling.
8. `apps/audit`, wired through the service layer rather than signals, so the
   actor is always known.

Steps 1 and 2 are prerequisites for everything after them. Steps 3–5 are the
critical path to the console running on real data.
