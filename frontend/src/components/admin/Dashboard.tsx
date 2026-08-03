'use client';

import { useCallback, useEffect, useState } from 'react';

import { BookingsTable } from './BookingsTable';
import { ConciergeFeed } from './ConciergeFeed';
import { StatGrid } from './StatCard';
import { SuiteInventory } from './SuiteInventory';
import { adminFetch, AdminApiError } from '@/lib/admin/api';
import {
  toConciergeRequest,
  toMetrics,
  toReservation,
  toSuite,
  type Paginated,
  type WireConcierge,
  type WireOverview,
  type WireReservation,
  type WireSuite,
} from '@/lib/admin/mappers';
import type {
  AdminReservation,
  AdminSuite,
  ConciergeRequest,
  ExecutiveMetric,
  HousekeepingStatus,
} from '@/types/admin';

/**
 * The console, against the real API.
 *
 * All four panels load in parallel and fail independently: a 403 on revenue
 * (staff role) must not blank the bookings table beside it. Each section keeps
 * its own error so one broken endpoint costs one panel, not the shift.
 *
 * Mutations are optimistic with rollback. A housekeeping chip that waits for a
 * round trip before repainting feels broken on a hotel wifi connection, and the
 * failure case — the server refusing — is rare enough to be worth a visible
 * correction rather than a permanent delay.
 */

const POLL_MS = 20_000;

type Panel<T> = { data: T; error: string | null; loading: boolean };

function idle<T>(initial: T): Panel<T> {
  return { data: initial, error: null, loading: true };
}

function describe(cause: unknown): string {
  if (cause instanceof AdminApiError) return cause.message;
  return 'Could not reach the server.';
}

export function Dashboard() {
  const [metrics, setMetrics] = useState<Panel<ExecutiveMetric[]>>(idle<ExecutiveMetric[]>([]));
  const [bookings, setBookings] = useState<Panel<AdminReservation[]>>(idle<AdminReservation[]>([]));
  const [suites, setSuites] = useState<Panel<AdminSuite[]>>(idle<AdminSuite[]>([]));
  const [requests, setRequests] = useState<Panel<ConciergeRequest[]>>(idle<ConciergeRequest[]>([]));

  /* -------------------------------------------------------------- load -- */

  const loadMetrics = useCallback(async (signal?: AbortSignal) => {
    try {
      const wire = await adminFetch<WireOverview>('/admin/analytics/overview/', { signal });
      setMetrics({ data: toMetrics(wire), error: null, loading: false });
    } catch (cause) {
      if (signal?.aborted) return;
      setMetrics((current) => ({ ...current, error: describe(cause), loading: false }));
    }
  }, []);

  const loadBookings = useCallback(async (signal?: AbortSignal) => {
    try {
      const wire = await adminFetch<Paginated<WireReservation>>('/admin/reservations/', {
        signal,
        params: { page_size: 60 },
      });
      setBookings({ data: wire.results.map(toReservation), error: null, loading: false });
    } catch (cause) {
      if (signal?.aborted) return;
      setBookings((current) => ({ ...current, error: describe(cause), loading: false }));
    }
  }, []);

  const loadSuites = useCallback(async (signal?: AbortSignal) => {
    try {
      // This endpoint has pagination_class = None, so it returns a bare array.
      const wire = await adminFetch<WireSuite[]>('/admin/rooms/', { signal });
      setSuites({ data: wire.map(toSuite), error: null, loading: false });
    } catch (cause) {
      if (signal?.aborted) return;
      setSuites((current) => ({ ...current, error: describe(cause), loading: false }));
    }
  }, []);

  const loadRequests = useCallback(async (signal?: AbortSignal) => {
    try {
      const wire = await adminFetch<Paginated<WireConcierge>>('/admin/concierge/', {
        signal,
        params: { page_size: 40 },
      });
      const mapped = wire.results
        .map(toConciergeRequest)
        .filter((request): request is ConciergeRequest => request !== null);
      setRequests({ data: mapped, error: null, loading: false });
    } catch (cause) {
      if (signal?.aborted) return;
      setRequests((current) => ({ ...current, error: describe(cause), loading: false }));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = () =>
      Promise.all([
        loadMetrics(controller.signal),
        loadBookings(controller.signal),
        loadSuites(controller.signal),
        loadRequests(controller.signal),
      ]);

    load();

    // Polling, not SSE. Twenty seconds is well inside human response time for a
    // towel request, works through every proxy, and costs no deployment
    // dependency. Paused when the tab is hidden — nobody is reading it, and a
    // console left open overnight would otherwise poll 1,700 times.
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_MS);

    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [loadMetrics, loadBookings, loadSuites, loadRequests]);

  /* ---------------------------------------------------------- mutations -- */

  const approve = useCallback(
    async (reference: string) => {
      await adminFetch(`/admin/reservations/${reference}/confirm/`, { method: 'POST' });
      await Promise.all([loadBookings(), loadMetrics()]);
    },
    [loadBookings, loadMetrics],
  );

  const checkIn = useCallback(
    async (reference: string) => {
      await adminFetch(`/admin/reservations/${reference}/check-in/`, { method: 'POST' });
      await Promise.all([loadBookings(), loadSuites(), loadMetrics()]);
    },
    [loadBookings, loadSuites, loadMetrics],
  );

  const setUnitStatus = useCallback(
    async (unitId: string, status: HousekeepingStatus) => {
      await adminFetch(`/admin/units/${unitId}/status/`, {
        method: 'PATCH',
        body: { housekeeping: status },
      });
      await Promise.all([loadSuites(), loadMetrics()]);
    },
    [loadSuites, loadMetrics],
  );

  const setBookable = useCallback(
    async (slug: string, isBookable: boolean) => {
      await adminFetch(`/admin/rooms/${slug}/`, {
        method: 'PATCH',
        body: { is_bookable: isBookable },
      });
      await loadSuites();
    },
    [loadSuites],
  );

  const advanceRequest = useCallback(
    async (id: string, status: ConciergeRequest['status']) => {
      await adminFetch(`/admin/concierge/${id}/status/`, {
        method: 'PATCH',
        body: { status },
      });
      await Promise.all([loadRequests(), loadMetrics()]);
    },
    [loadRequests, loadMetrics],
  );

  /* ------------------------------------------------------------ render -- */

  return (
    <div className="mx-auto flex max-w-[110rem] flex-col gap-10">
      <section aria-labelledby="overview" className="scroll-mt-8">
        <header className="mb-4">
          <p className="adm-eyebrow">Executive overview</p>
          <h1 id="overview" className="mt-1.5 text-xl text-[var(--adm-text)]">
            Tonight at a glance
          </h1>
        </header>

        <PanelState panel={metrics} label="metrics" empty="No figures yet.">
          <StatGrid metrics={metrics.data} />
        </PanelState>
      </section>

      <div className="scroll-mt-8">
        <PanelState panel={bookings} label="bookings" empty="No reservations yet.">
          <BookingsTable initial={bookings.data} onApprove={approve} onCheckIn={checkIn} />
        </PanelState>
      </div>

      <div className="grid gap-8 2xl:grid-cols-[1.35fr_1fr]">
        <div className="scroll-mt-8">
          <PanelState panel={suites} label="inventory" empty="No room types configured.">
            <SuiteInventory
              initial={suites.data}
              onToggleBookable={setBookable}
              onSetUnitStatus={setUnitStatus}
            />
          </PanelState>
        </div>

        <div className="scroll-mt-8">
          <PanelState panel={requests} label="concierge" empty="Nothing open.">
            <ConciergeFeed initial={requests.data} onAdvance={advanceRequest} />
          </PanelState>
        </div>
      </div>
    </div>
  );
}

/** Loading skeleton, error notice, or the panel itself. */
function PanelState<T>({
  panel,
  label,
  empty,
  children,
}: {
  panel: Panel<T[]>;
  label: string;
  empty: string;
  children: React.ReactNode;
}) {
  if (panel.loading && panel.data.length === 0) {
    return (
      <div className="adm-panel grid min-h-40 place-items-center p-8">
        <p className="adm-label" aria-live="polite">
          Loading {label}…
        </p>
      </div>
    );
  }

  if (panel.error && panel.data.length === 0) {
    return (
      <div className="adm-panel p-8">
        <p className="adm-badge adm-badge-alert">Could not load {label}</p>
        <p className="mt-3 text-sm text-[var(--adm-dim)]">{panel.error}</p>
      </div>
    );
  }

  if (panel.data.length === 0) {
    return (
      <div className="adm-panel grid min-h-40 place-items-center p-8">
        <p className="text-sm text-[var(--adm-muted)]">{empty}</p>
      </div>
    );
  }

  return (
    <>
      {/* A refresh that fails after a good load keeps the stale data on screen
          and says so, rather than replacing a working table with an error. */}
      {panel.error ? (
        <p className="adm-badge adm-badge-warn mb-3">Refresh failed — showing last known data</p>
      ) : null}
      {children}
    </>
  );
}
