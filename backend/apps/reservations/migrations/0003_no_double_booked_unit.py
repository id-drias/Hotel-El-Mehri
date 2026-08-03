"""Database-level guarantee that one unit cannot hold two overlapping stays.

`services.create_reservation` already locks candidate units and re-checks
availability inside the transaction. This is the backstop for when that path is
bypassed — a management command, a data import, a future endpoint written in a
hurry. Application logic can be forgotten; a constraint cannot.

PostgreSQL only. `ExclusionConstraint` needs GiST, and SQLite has no equivalent,
so on SQLite (dev convenience and the test suite) this migration is a no-op and
the row lock is the only guard. That is an acceptable trade for a local
database, and the reason the service layer does not rely on the constraint
alone.
"""

from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import DateRangeField, RangeBoundary, RangeOperators
from django.db import migrations, models


class TsTzRange(models.Func):
    """Builds a half-open [start, end) daterange for the constraint."""

    function = "daterange"
    output_field = DateRangeField()


def _is_postgres(schema_editor) -> bool:
    return schema_editor.connection.vendor == "postgresql"


def add_constraint(apps, schema_editor):
    if not _is_postgres(schema_editor):
        return

    # btree_gist lets a GiST index mix the scalar `unit_id` equality with the
    # range overlap. Without it the constraint cannot be created.
    schema_editor.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")
    schema_editor.execute(
        """
        ALTER TABLE reservations_roomassignment
        ADD CONSTRAINT no_double_booked_unit
        EXCLUDE USING gist (
            unit_id WITH =,
            daterange(start_date, end_date, '[)') WITH &&
        );
        """
    )


def drop_constraint(apps, schema_editor):
    if not _is_postgres(schema_editor):
        return
    schema_editor.execute(
        "ALTER TABLE reservations_roomassignment DROP CONSTRAINT IF EXISTS no_double_booked_unit;"
    )


class Migration(migrations.Migration):
    dependencies = [("reservations", "0002_payment_roomassignment_and_more")]

    operations = [
        migrations.RunPython(add_constraint, drop_constraint, elidable=False),
    ]
