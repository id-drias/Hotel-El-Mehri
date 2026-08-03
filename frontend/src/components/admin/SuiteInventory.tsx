'use client';

import { useEffect, useState } from 'react';

import type { AdminSuite, HousekeepingStatus, SuiteUnit } from '@/types/admin';

/**
 * Suite and inventory control.
 *
 * Three controls per category — sell/stop-sell, a nightly rate override, and
 * per-unit housekeeping state.
 *
 * The rate override is a separate field rather than an edit of the base rate,
 * and that distinction is load-bearing: overwriting `base_price` would silently
 * reprice every future booking, including quotes already given to guests. An
 * override is a dated exception the pricing engine layers on top. It needs a
 * rate-calendar table to be real — see the Step 2 schema.
 */

const STATUS_ORDER: HousekeepingStatus[] = ['clean', 'occupied', 'dirty', 'maintenance'];

/* Labels only. Colour is resolved from `data-status` in admin.css — see the
   note there on why this is not an inline style. */
const STATUS_LABEL: Record<HousekeepingStatus, string> = {
  clean: 'Clean',
  occupied: 'Occupied',
  dirty: 'Dirty',
  maintenance: 'Maintenance',
};

function nextStatus(current: HousekeepingStatus): HousekeepingStatus {
  return STATUS_ORDER[(STATUS_ORDER.indexOf(current) + 1) % STATUS_ORDER.length];
}

const dzd = new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 0 });

function sellableCount(units: SuiteUnit[]): number {
  return units.filter((unit) => unit.status === 'clean').length;
}

function SuiteCard({
  suite,
  onToggle,
  onRate,
  onCycleUnit,
}: {
  suite: AdminSuite;
  onToggle: (slug: string, next: boolean) => void;
  onRate: (slug: string, next: number | null) => void;
  onCycleUnit: (slug: string, unitId: string) => void;
}) {
  const effectiveRate = suite.rateOverrideDzd ?? suite.baseRateDzd;
  const ready = sellableCount(suite.units);

  return (
    <article className="adm-panel adm-enter p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base text-[var(--adm-text)]">{suite.name}</h3>
          <p className="mt-1 text-xs text-[var(--adm-muted)]">
            {suite.tier} tier · {ready} of {suite.units.length} ready to sell
          </p>
        </div>

        <label className="adm-switch">
          <input
            type="checkbox"
            checked={suite.isBookable}
            onChange={(event) => onToggle(suite.slug, event.target.checked)}
          />
          <span aria-hidden="true" className="adm-switch-track">
            <span className="adm-switch-thumb" />
          </span>
          <span className="text-xs text-[var(--adm-dim)]">
            {suite.isBookable ? 'Open for sale' : 'Stop sell'}
          </span>
        </label>
      </header>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="adm-label">Base rate / night</p>
          <p className="mt-1.5 text-sm text-[var(--adm-dim)]">
            {suite.baseRateDzd === null ? 'On request' : `${dzd.format(suite.baseRateDzd)} DZD`}
          </p>
        </div>

        <div>
          <label className="adm-label block" htmlFor={`rate-${suite.slug}`}>
            Override / night
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              id={`rate-${suite.slug}`}
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              className="adm-input"
              placeholder={suite.baseRateDzd === null ? '—' : dzd.format(suite.baseRateDzd)}
              value={suite.rateOverrideDzd ?? ''}
              onChange={(event) => {
                const raw = event.target.value;
                onRate(suite.slug, raw === '' ? null : Number(raw));
              }}
            />
            {suite.rateOverrideDzd !== null ? (
              <button type="button" className="adm-btn" onClick={() => onRate(suite.slug, null)}>
                Clear
                <span className="sr-only"> rate override for {suite.name}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {effectiveRate !== null && suite.rateOverrideDzd !== null ? (
        <p className="mt-3 text-xs" style={{ color: 'var(--adm-gold)' }}>
          Selling at {dzd.format(effectiveRate)} DZD tonight — override active.
        </p>
      ) : null}

      <div className="mt-5">
        <p className="adm-label">Housekeeping</p>
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {suite.units.map((unit) => (
            <li key={unit.id}>
              {/* Click cycles the status. The accessible name states the current
                  state and the next one, so a keyboard user is never guessing
                  what activating it will do. */}
              <button
                type="button"
                className="adm-unit"
                data-status={unit.status}
                onClick={() => onCycleUnit(suite.slug, unit.id)}
              >
                <span aria-hidden="true">{unit.number}</span>
                <span className="sr-only">
                  Room {unit.number}, currently {STATUS_LABEL[unit.status]}. Activate to set{' '}
                  {STATUS_LABEL[nextStatus(unit.status)]}.
                </span>
              </button>
            </li>
          ))}
        </ul>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {STATUS_ORDER.map((status) => (
            <li key={status} className="flex items-center gap-1.5 text-[0.6875rem]">
              <span
                aria-hidden="true"
                className="adm-swatch inline-block h-2 w-2 rounded-full"
                data-status={status}
              />
              <span className="text-[var(--adm-muted)]">{STATUS_LABEL[status]}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function SuiteInventory({
  initial,
  onToggleBookable,
  onSetUnitStatus,
}: {
  initial: AdminSuite[];
  /** Omit for a fixture-only build; the panel then mutates locally. */
  onToggleBookable?: (slug: string, isBookable: boolean) => Promise<void>;
  onSetUnitStatus?: (unitId: string, status: HousekeepingStatus) => Promise<void>;
}) {
  const [suites, setSuites] = useState(initial);
  const [announcement, setAnnouncement] = useState('');

  // The parent refetches after each mutation; local state paints the
  // optimistic step in between.
  useEffect(() => setSuites(initial), [initial]);

  const toggle = async (slug: string, next: boolean) => {
    const snapshot = suites;
    setSuites((current) =>
      current.map((suite) => (suite.slug === slug ? { ...suite, isBookable: next } : suite)),
    );
    const name = suites.find((s) => s.slug === slug)?.name ?? slug;
    setAnnouncement(`${name} ${next ? 'opened for sale' : 'stopped'}.`);

    if (!onToggleBookable) return;

    try {
      await onToggleBookable(slug, next);
    } catch (cause) {
      setSuites(snapshot);
      setAnnouncement(
        cause instanceof Error ? `Could not update ${name}: ${cause.message}` : 'Update failed.',
      );
    }
  };

  const setRate = (slug: string, next: number | null) => {
    setSuites((current) =>
      current.map((suite) =>
        suite.slug === slug
          ? { ...suite, rateOverrideDzd: next !== null && Number.isFinite(next) ? next : null }
          : suite,
      ),
    );
  };

  const cycleUnit = async (slug: string, unitId: string) => {
    // The next status is resolved before the update, not inside it. A state
    // updater must be pure — React may invoke it twice under StrictMode, and
    // the announcement used to fire from inside the map, so a single click
    // queued it twice.
    const unit = suites.find((suite) => suite.slug === slug)?.units.find((u) => u.id === unitId);
    if (!unit) return;

    const snapshot = suites;
    const next = nextStatus(unit.status);
    setAnnouncement(`Room ${unit.number} set to ${STATUS_LABEL[next]}.`);

    setSuites((current) =>
      current.map((suite) =>
        suite.slug !== slug
          ? suite
          : {
              ...suite,
              units: suite.units.map((u) => (u.id === unitId ? { ...u, status: next } : u)),
            },
      ),
    );

    if (!onSetUnitStatus) return;

    try {
      await onSetUnitStatus(unitId, next);
    } catch (cause) {
      setSuites(snapshot);
      setAnnouncement(
        cause instanceof Error
          ? `Could not update room ${unit.number}: ${cause.message}`
          : 'Update failed.',
      );
    }
  };

  return (
    <section aria-labelledby="inventory-heading">
      <header className="mb-4">
        <p className="adm-eyebrow">Inventory</p>
        <h2 id="inventory-heading" className="mt-1.5 text-lg text-[var(--adm-text)]">
          Suite &amp; housekeeping control
        </h2>
      </header>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="grid gap-4 xl:grid-cols-2">
        {suites.map((suite) => (
          <SuiteCard
            key={suite.slug}
            suite={suite}
            onToggle={toggle}
            onRate={setRate}
            onCycleUnit={cycleUnit}
          />
        ))}
      </div>
    </section>
  );
}
