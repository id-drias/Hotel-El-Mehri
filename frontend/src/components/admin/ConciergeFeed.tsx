'use client';

import { useEffect, useMemo, useState } from 'react';

import type {
  ConciergeKind,
  ConciergePriority,
  ConciergeRequest,
  ConciergeStatus,
} from '@/types/admin';

/**
 * The in-stay request queue.
 *
 * "Live" is aspirational here: this renders a fixed list and advances it
 * locally. A genuinely live feed needs a push channel — see the Step 2 notes on
 * SSE versus polling. What the component does guarantee is that when the feed
 * *is* wired up, new items announce themselves once rather than re-reading the
 * whole list, which is the part that is easy to get wrong.
 *
 * Ordering is urgent-first, then oldest-first inside a priority band. A queue
 * sorted newest-first buries the request that has been waiting longest, which
 * is precisely the one about to become a complaint.
 */

const PRIORITY_RANK: Record<ConciergePriority, number> = { urgent: 0, high: 1, normal: 2 };

const STATUS_META: Record<ConciergeStatus, { label: string; cls: string; next: string | null }> = {
  new: { label: 'New', cls: 'adm-badge-alert', next: 'Start' },
  in_progress: { label: 'In progress', cls: 'adm-badge-info', next: 'Resolve' },
  resolved: { label: 'Resolved', cls: 'adm-badge-ok', next: null },
};

const NEXT_STATUS: Record<ConciergeStatus, ConciergeStatus | null> = {
  new: 'in_progress',
  in_progress: 'resolved',
  resolved: null,
};

const KIND_META: Record<ConciergeKind, { label: string; icon: React.ReactNode }> = {
  transport: {
    label: 'Transport',
    icon: (
      <>
        <path d="M4 15.5V9.2a2 2 0 0 1 1.4-1.9l2-.6a12 12 0 0 1 7.2 0l2 1.9a2 2 0 0 1 1.4 1.9v5.9" />
        <circle cx="7.3" cy="16.4" r="1.6" />
        <circle cx="16.7" cy="16.4" r="1.6" />
        <path d="M5.4 12.3h13.2" />
      </>
    ),
  },
  dining: {
    label: 'Dining',
    icon: (
      <>
        <path d="M6.5 3v8.5a2 2 0 0 0 2 2h.3V21" />
        <path d="M6.5 3v5" />
        <path d="M10.8 3v5" />
        <path d="M17.5 3c-1.4 1.6-2 3.6-2 5.6 0 1.6.8 2.6 2 2.9V21" />
      </>
    ),
  },
  spa: {
    label: 'Spa',
    icon: (
      <>
        <path d="M12 21c0-5.2 3.2-9.2 8-9.8-.4 5.2-3.9 9.2-8 9.8z" />
        <path d="M12 21c0-5.2-3.2-9.2-8-9.8.4 5.2 3.9 9.2 8 9.8z" />
        <path d="M12 21v-3" />
      </>
    ),
  },
  housekeeping: {
    label: 'Housekeeping',
    icon: (
      <>
        <path d="M4 20h16" />
        <path d="M7 20V9.5l5-5.5 5 5.5V20" />
        <path d="M10.2 20v-4.4h3.6V20" />
      </>
    ),
  },
  tech: {
    label: 'Technical',
    icon: (
      <>
        <rect x="3" y="4.5" width="18" height="12" rx="2" />
        <path d="M8.5 20h7" />
        <path d="M12 16.5V20" />
      </>
    ),
  },
};

/**
 * How long a request has been waiting.
 *
 * Reads the real clock. That would be a hydration hazard in a server-rendered
 * component — server and client would disagree by the round-trip — but this
 * feed only ever renders once its data has arrived from a browser fetch, so
 * there is no server-rendered markup to mismatch. `now` is passed in rather
 * than read here so every row in one render agrees on the time.
 */
function age(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60 ? `${minutes % 60} min ` : ''}ago`;
}

export function ConciergeFeed({
  initial,
  onAdvance,
}: {
  initial: ConciergeRequest[];
  /** Omit for a fixture-only build; the feed then mutates locally. */
  onAdvance?: (id: string, status: ConciergeStatus) => Promise<void>;
}) {
  const [requests, setRequests] = useState(initial);
  const [showResolved, setShowResolved] = useState(false);
  const [flashed, setFlashed] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  // One clock reading per render, ticked every half minute so "4 min ago" does
  // not sit there reading "just now" for an entire shift.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // The parent refetches after each mutation; local state paints the
  // optimistic step in between.
  useEffect(() => setRequests(initial), [initial]);

  const advance = async (id: string) => {
    // Resolved outside the updater — a state updater must stay pure, or
    // StrictMode's double invocation queues the announcement twice.
    const request = requests.find((item) => item.id === id);
    const next = request ? NEXT_STATUS[request.status] : null;
    if (!request || !next) return;

    const snapshot = requests;
    setRequests((current) =>
      current.map((item) => (item.id === id ? { ...item, status: next } : item)),
    );
    setAnnouncement(`${request.guestName}'s request set to ${STATUS_META[next].label}.`);
    setFlashed(id);

    if (!onAdvance) return;

    try {
      await onAdvance(id, next);
    } catch (cause) {
      setRequests(snapshot);
      setAnnouncement(
        cause instanceof Error
          ? `Could not update the request: ${cause.message}`
          : 'Update failed.',
      );
    }
  };

  const visible = useMemo(() => {
    return [...requests]
      .filter((request) => showResolved || request.status !== 'resolved')
      .sort((a, b) => {
        const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (byPriority !== 0) return byPriority;
        // Oldest first inside a band — the longest wait is the most urgent.
        return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
      });
  }, [requests, showResolved]);

  const openCount = requests.filter((r) => r.status !== 'resolved').length;

  return (
    <section className="adm-glass adm-enter flex flex-col" aria-labelledby="concierge-heading">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--adm-line)] p-5">
        <div>
          <p className="adm-eyebrow">Concierge</p>
          <h2 id="concierge-heading" className="mt-1.5 text-lg text-[var(--adm-text)]">
            Guest request feed
          </h2>
          <p className="mt-1 text-xs text-[var(--adm-muted)]">
            {openCount} open {openCount === 1 ? 'request' : 'requests'}
          </p>
        </div>

        <button
          type="button"
          className="adm-chip"
          aria-pressed={showResolved}
          onClick={() => setShowResolved((value) => !value)}
        >
          Show resolved
        </button>
      </header>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {visible.length === 0 ? (
        <p className="p-10 text-center text-sm text-[var(--adm-muted)]">
          Nothing open. The queue is clear.
        </p>
      ) : (
        <ul className="flex flex-col gap-1 p-3">
          {visible.map((request) => {
            // Defensive lookups. A value the API adds tomorrow — a new request
            // kind, a new status — should cost this row its icon, not take the
            // whole console down with an undefined dereference.
            const kind = KIND_META[request.kind] ?? KIND_META.housekeeping;
            const status = STATUS_META[request.status] ?? STATUS_META.new;

            return (
              <li
                key={request.id}
                data-priority={request.priority}
                className={`adm-feed-item ${flashed === request.id ? 'adm-flash' : ''}`}
                onAnimationEnd={() => setFlashed((id) => (id === request.id ? null : id))}
              >
                <span className="adm-feed-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {kind.icon}
                  </svg>
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-[var(--adm-text)]">{request.guestName}</span>
                    {request.isVip ? <span className="adm-badge adm-badge-vip">VIP</span> : null}
                    {request.priority === 'urgent' ? (
                      <span className="adm-badge adm-badge-alert">Urgent</span>
                    ) : null}
                    <span className={`adm-badge ${status.cls}`}>{status.label}</span>
                  </div>

                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--adm-dim)]">
                    {request.summary}
                  </p>

                  <p className="mt-1.5 text-xs text-[var(--adm-muted)]">
                    {kind.label} · {request.suite} · {age(request.receivedAt, now)}
                  </p>
                </div>

                <div className="flex items-start">
                  {status.next ? (
                    <button
                      type="button"
                      className={`adm-btn ${request.priority === 'urgent' ? 'adm-btn-gold' : ''}`}
                      onClick={() => advance(request.id)}
                    >
                      {status.next}
                      <span className="sr-only">
                        {' '}
                        {kind.label} request from {request.guestName}
                      </span>
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
