"""Seed a working dataset for local development.

    python manage.py seed_demo

Idempotent — safe to re-run. Refuses to touch a database that is not obviously
local, because "seed the demo data" against production is a one-way trip.

The guest names are fictional. Real reservation data is personal data under
Algeria's Law 18-07 and does not belong in a fixture, a repository or a
developer's laptop.
"""

from __future__ import annotations

import datetime as dt
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.concierge.models import ConciergeRequest
from apps.reservations import services
from apps.reservations.models import Payment, Reservation
from apps.rooms.models import Room, RoomTranslation, RoomUnit

User = get_user_model()
DAY = dt.timedelta(days=1)

ROOMS = [
    ("chambre-standard", "Chambre Standard", 14500, 22, 2, 0, ["301", "302", "303", "304"]),
    ("suite-junior", "Suite Junior", 19500, 39, 2, 1, ["401", "402", "403", "404"]),
    ("suite-executive", "Suite Exécutive", 31000, 55, 2, 2, ["501", "502", "503"]),
    ("suite-royale", "Suite Royale", 46000, 80, 2, 2, ["601", "602", "603"]),
]

STAFF = [
    ("reception", "Reception", "Desk", User.Role.STAFF),
    ("manager", "Yacine", "Meddour", User.Role.MANAGER),
    ("director", "Nadia", "Cherif", User.Role.ADMIN),
]

GUESTS = [
    ("Amine", "Belkacem", "a.belkacem@example.dz", "0770112233", "suite-royale", 0, 4),
    ("Claire", "Fontaine", "c.fontaine@example.fr", "0661903477", "suite-executive", 0, 2),
    ("Sofia", "Haddad", "s.haddad@example.dz", "0555448812", "suite-royale", 0, 7),
    ("Karim", "Ould Ali", "k.ouldali@example.dz", "0770552109", "chambre-standard", 2, 1),
    ("Leila", "Zerrouki", "l.zerrouki@example.dz", "0771085590", "suite-executive", 1, 5),
    ("Omar", "Benyoucef", "o.benyoucef@example.dz", "0550773124", "suite-junior", 3, 2),
]

REQUESTS = [
    (ConciergeRequest.Kind.TRANSPORT, ConciergeRequest.Priority.URGENT, "601",
     "Airport transfer at 11:40, two passengers and four cases."),
    (ConciergeRequest.Kind.DINING, ConciergeRequest.Priority.HIGH, "503",
     "Private table at El Mayda, 20:30, party of four. One guest is coeliac."),
    (ConciergeRequest.Kind.SPA, ConciergeRequest.Priority.NORMAL, "501",
     "Two massage cabins at 17:00. Awaiting therapist confirmation."),
    (ConciergeRequest.Kind.HOUSEKEEPING, ConciergeRequest.Priority.HIGH, "602",
     "Cot requested before a 23:00 arrival, plus extra towels."),
    (ConciergeRequest.Kind.TECHNICAL, ConciergeRequest.Priority.NORMAL, "403",
     "Satellite receiver not responding on the bedroom set."),
]

DEFAULT_PASSWORD = "console-dev-2026"  # noqa: S105 - local fixture only


class Command(BaseCommand):
    help = "Seed rooms, units, staff accounts, reservations and concierge requests."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Run even when the database does not look local.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self._guard(options["force"])

        rooms = self._rooms()
        self._staff()
        self._reservations(rooms)
        self._requests()

        self.stdout.write(self.style.SUCCESS("\nSeeded."))
        self.stdout.write(f"  Sign in at /admin with any of: {', '.join(u for u, *_ in STAFF)}")
        self.stdout.write(f"  Password: {DEFAULT_PASSWORD}")

    def _guard(self, force: bool) -> None:
        if force:
            return

        name = str(settings.DATABASES["default"].get("NAME", ""))
        host = str(settings.DATABASES["default"].get("HOST", ""))
        local = (
            settings.DEBUG
            or "sqlite" in settings.DATABASES["default"]["ENGINE"]
            or host in {"", "localhost", "127.0.0.1"}
        )
        if not local:
            raise CommandError(
                f"Refusing to seed {name} on {host}: it does not look like a local database. "
                "Pass --force if you are certain."
            )

    def _rooms(self) -> dict[str, Room]:
        created = {}
        for slug, name, price, surface, adults, children, numbers in ROOMS:
            room, _ = Room.objects.update_or_create(
                slug=slug,
                defaults={
                    "base_price": Decimal(price),
                    "surface_m2": surface,
                    "max_adults": adults,
                    "max_children": children,
                    "total_units": len(numbers),
                    "is_bookable": True,
                    "is_published": True,
                },
            )
            RoomTranslation.objects.update_or_create(
                room=room, language="fr", defaults={"name": name}
            )
            for number in numbers:
                RoomUnit.objects.get_or_create(
                    room=room, number=number, defaults={"floor": int(number[0])}
                )
            created[slug] = room

        self.stdout.write(f"  {len(created)} room types, {RoomUnit.objects.count()} units")
        return created

    def _staff(self) -> None:
        for username, first, last, role in STAFF:
            user, is_new = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@hotelelmehri.test",
                    "first_name": first,
                    "last_name": last,
                    "role": role,
                },
            )
            if is_new:
                user.set_password(DEFAULT_PASSWORD)
                user.save(update_fields=["password"])

        self.stdout.write(f"  {len(STAFF)} staff accounts")

    def _reservations(self, rooms: dict[str, Room]) -> None:
        if Reservation.objects.exists():
            self.stdout.write("  reservations already present, skipping")
            return

        today = timezone.localdate()
        manager = User.objects.filter(role=User.Role.MANAGER).first()

        for index, (first, last, email, phone, slug, offset, nights) in enumerate(GUESTS):
            reservation = services.create_reservation(
                room=rooms[slug],
                check_in=today + offset * DAY,
                check_out=today + (offset + nights) * DAY,
                first_name=first,
                last_name=last,
                email=email,
                phone_number=phone,
                adults=2,
                board=Reservation.Board.HB,
                source=Reservation.Source.WEB,
            )

            # A spread of states so every console filter has something in it.
            if index % 3 != 2:
                services.confirm_reservation(reservation=reservation, actor=manager)
                services.record_payment(
                    reservation=reservation,
                    amount=reservation.total_price or Decimal("0"),
                    method=Payment.Method.CIB,
                    actor=manager,
                )
            if index % 3 == 1:
                services.check_in(reservation=reservation, actor=manager)

        self.stdout.write(f"  {Reservation.objects.count()} reservations")

    def _requests(self) -> None:
        if ConciergeRequest.objects.exists():
            self.stdout.write("  concierge requests already present, skipping")
            return

        for kind, priority, number, summary in REQUESTS:
            ConciergeRequest.objects.create(
                kind=kind,
                priority=priority,
                summary=summary,
                unit=RoomUnit.objects.filter(number=number).first(),
            )

        self.stdout.write(f"  {ConciergeRequest.objects.count()} concierge requests")
