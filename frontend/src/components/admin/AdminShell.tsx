'use client';

import type { ReactNode } from 'react';

import { wordmark } from '@/config';
import { useSession } from '@/lib/admin/session';

/**
 * Console chrome: rail, top bar, ambient field.
 *
 * The nav is a placeholder set of anchors to sections on this one page — there
 * is exactly one screen so far, and rendering dead links to routes that 404
 * would be worse than rendering none.
 */

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'bookings-heading', label: 'Bookings' },
  { id: 'inventory-heading', label: 'Inventory' },
  { id: 'concierge-heading', label: 'Concierge' },
];

function Wordmark() {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="keep-tracking text-sm tracking-[0.3em] text-[var(--adm-text)]"
        style={{ fontFamily: 'var(--font-adm-display), Georgia, serif' }}
      >
        {wordmark.primary}
      </span>
      <span className="keep-tracking text-[0.5rem] tracking-[0.4em] text-[var(--adm-gold)]">
        CONSOLE
      </span>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="adm relative">
      <div className="adm-ambient" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen">
        {/* Rail. Hidden below xl — with one screen there is nothing to navigate
            between on a phone, and a drawer for four anchors is ceremony. */}
        <aside className="hidden w-60 shrink-0 border-e border-[var(--adm-line)] p-5 xl:block">
          <Wordmark />

          <nav aria-label="Console sections" className="mt-10 flex flex-col gap-1">
            {SECTIONS.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="adm-nav-link"
                aria-current={index === 0 ? 'true' : undefined}
              >
                {section.label}
              </a>
            ))}
          </nav>

          <SignedInAs />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--adm-line)] p-5">
            <div className="xl:hidden">
              <Wordmark />
            </div>

            <div className="ms-auto flex items-center gap-3">
              <span className="text-xs text-[var(--adm-muted)]">Ouargla</span>
              <SignOutButton />
            </div>
          </header>

          <main className="flex-1 p-5 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

function SignedInAs() {
  const { status, user } = useSession();

  return (
    <div className="mt-10 border-t border-[var(--adm-line)] pt-5">
      <p className="adm-label">Signed in as</p>
      {status === 'authenticated' && user ? (
        <>
          <p className="mt-2 text-sm text-[var(--adm-text)]">
            {`${user.first_name} ${user.last_name}`.trim() || user.username}
          </p>
          <p className="text-xs text-[var(--adm-muted)] capitalize">{user.role}</p>
        </>
      ) : (
        <p className="mt-2 text-xs text-[var(--adm-muted)]">Not signed in</p>
      )}
    </div>
  );
}

function SignOutButton() {
  const { status, signOut } = useSession();

  if (status !== 'authenticated') return null;

  return (
    <button type="button" className="adm-btn" onClick={() => void signOut()}>
      Sign out
    </button>
  );
}
