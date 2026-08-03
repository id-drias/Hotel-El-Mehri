'use client';

import { useState, type FormEvent } from 'react';

import { brand } from '@/config';
import { AdminApiError } from '@/lib/admin/api';
import { isConsoleUser, useSession } from '@/lib/admin/session';

/**
 * Renders the console for a signed-in staff member, and the sign-in form for
 * everyone else.
 *
 * A guest who signs in here gets told their account is not a console account,
 * rather than an empty dashboard full of 403s — the API would refuse every
 * request, and four broken panels is a worse answer than one clear sentence.
 */
export function SignInGate({ children }: { children: React.ReactNode }) {
  const { status, user, signIn } = useSession();

  if (status === 'loading') {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="adm-label" aria-live="polite">
          Restoring session…
        </p>
      </div>
    );
  }

  if (status === 'authenticated' && isConsoleUser(user)) {
    return <>{children}</>;
  }

  return (
    <SignInForm
      onSubmit={signIn}
      wrongAudience={status === 'authenticated' && !isConsoleUser(user)}
    />
  );
}

function SignInForm({
  onSubmit,
  wrongAudience,
}: {
  onSubmit: (username: string, password: string) => Promise<void>;
  wrongAudience: boolean;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await onSubmit(username, password);
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="adm-glass adm-enter w-full max-w-sm p-8">
        <p className="adm-eyebrow">{brand.shortName}</p>
        <h1 className="mt-2 text-lg text-[var(--adm-text)]">Console sign-in</h1>

        {wrongAudience ? (
          <p className="adm-badge adm-badge-warn mt-5">This account is not a console account.</p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="block">
            <span className="adm-label">Username</span>
            <input
              className="adm-input mt-1.5"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              autoFocus
            />
          </label>

          <label className="block">
            <span className="adm-label">Password</span>
            <input
              type="password"
              className="adm-input mt-1.5"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {/* assertive, not polite: the visitor is waiting on this answer and
              has stopped reading everything else. */}
          {error ? (
            <p role="alert" className="text-xs text-[var(--adm-alert)]">
              {error}
            </p>
          ) : null}

          <button type="submit" className="adm-btn adm-btn-gold mt-2" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-xs text-[var(--adm-muted)]">
          Staff accounts only. Guest sign-in is on the main site.
        </p>
      </div>
    </div>
  );
}
