'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { login as apiLogin, logout as apiLogout, restoreSession, type SessionUser } from './api';

/**
 * Console session.
 *
 * Deliberately not a router guard: this renders the login form in place of the
 * dashboard rather than redirecting. A redirect to `/admin/login` and back is
 * two navigations and a lost scroll position for something that resolves in
 * one refresh call.
 *
 * `status` has three states, and conflating any two of them produces a visible
 * bug: `loading` is "we have not asked yet" (show nothing), `anonymous` is "we
 * asked and there is no session" (show the form), `authenticated` is the
 * dashboard. Starting at `anonymous` would flash the login form on every
 * reload for a signed-in user.
 */

type SessionState =
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: SessionUser };

type SessionContextValue = SessionState & {
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/** Roles allowed into the console at all. Mirrors `User.STAFF_ROLES`. */
const CONSOLE_ROLES = new Set(['staff', 'manager', 'admin']);

export function isConsoleUser(user: SessionUser | null): boolean {
  return user !== null && CONSOLE_ROLES.has(user.role);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading', user: null });

  useEffect(() => {
    let cancelled = false;

    restoreSession().then((user) => {
      if (cancelled) return;
      setState(user ? { status: 'authenticated', user } : { status: 'anonymous', user: null });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const user = await apiLogin(username, password);
    setState({ status: 'authenticated', user });
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setState({ status: 'anonymous', user: null });
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ ...state, signIn, signOut }),
    [state, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside <SessionProvider>.');
  }
  return context;
}
