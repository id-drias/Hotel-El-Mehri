/**
 * Browser-side API client for the admin console.
 *
 * Distinct from `lib/api/client.ts`, which runs on the server for public
 * content and knows nothing about authentication.
 *
 * Token handling:
 *
 * * The **refresh** token lives in an httpOnly cookie set by Django. JavaScript
 *   cannot read it, so an XSS cannot steal a long-lived credential.
 * * The **access** token lives in this module's memory — never `localStorage`.
 *   It dies with the tab, and it expires in 30 minutes regardless.
 * * A 401 triggers one refresh and one retry. Concurrent 401s share a single
 *   refresh promise, so ten parallel widgets do not fire ten refreshes and
 *   invalidate each other's rotated token.
 *
 * The stricter alternative is a BFF: Next route handlers holding the access
 * token server-side so it never reaches JS at all. That is the upgrade path if
 * the threat model tightens; it costs a proxy layer for every endpoint.
 */

/**
 * `localhost`, not `127.0.0.1` — and that is not interchangeable here.
 *
 * Cookies are scoped by *site*, and the browser treats `localhost` and
 * `127.0.0.1` as different sites even though they resolve to the same machine.
 * A page on `localhost:3000` calling `127.0.0.1:8000` is therefore a cross-site
 * fetch, and the SameSite=Lax refresh cookie is silently dropped — the session
 * appears to work until the first token refresh, then logs the user out with no
 * error anywhere. Ports are *not* part of a site, so `localhost:3000` to
 * `localhost:8000` is same-site and the cookie travels.
 *
 * The server-side client in `lib/api/client.ts` keeps 127.0.0.1 because it
 * sends no cookies and skips DNS.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }

  /** True when the caller should re-authenticate rather than retry. */
  get isAuthFailure(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
}

/* ------------------------------------------------------------------ token -- */

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Exchange the refresh cookie for a new access token.
 *
 * Returns null when there is no valid session, which is the signal to show the
 * login screen rather than to retry.
 */
export async function refreshAccessToken(): Promise<string | null> {
  // Deduplicated: `ROTATE_REFRESH_TOKENS` is on, so two concurrent refreshes
  // would race and the loser would be holding a blacklisted token.
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh/`, {
        method: 'POST',
        credentials: 'include', // sends the httpOnly refresh cookie
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });

      if (!response.ok) {
        accessToken = null;
        return null;
      }

      const data = (await response.json()) as { access?: string };
      accessToken = data.access ?? null;
      return accessToken;
    } catch {
      // Network failure is not the same as "logged out", but from the caller's
      // point of view there is no usable token either way.
      accessToken = null;
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/* ----------------------------------------------------------------- fetch -- */

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  /** Internal: prevents an infinite refresh loop. */
  _retried?: boolean;
};

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function adminFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, signal, _retried = false } = options;

  const response = await fetch(buildUrl(path, params), {
    method,
    credentials: 'include',
    signal,
    headers: {
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // One refresh, one retry. `_retried` stops a revoked session from looping.
  if (response.status === 401 && !_retried) {
    const token = await refreshAccessToken();
    if (token) return adminFetch<T>(path, { ...options, _retried: true });
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new AdminApiError(response.status, describe(response.status, payload), payload);
  }

  return payload as T;
}

/** Turns DRF's error shapes into one sentence a human can act on. */
function describe(status: number, payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const body = payload as Record<string, unknown>;

    if (typeof body.detail === 'string') return body.detail;

    // Field errors: `{"check_out": ["Check-out must be after check-in."]}`
    const first = Object.entries(body)[0];
    if (first) {
      const [field, messages] = first;
      const text = Array.isArray(messages) ? String(messages[0]) : String(messages);
      return field === 'non_field_errors' ? text : `${field}: ${text}`;
    }
  }

  if (status === 403) return 'Your role does not allow that action.';
  if (status === 409) return 'That changed while you were working on it.';
  return `Request failed (${status}).`;
}

/* ------------------------------------------------------------------ auth -- */

export type SessionUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'guest' | 'staff' | 'manager' | 'admin';
};

export async function login(username: string, password: string): Promise<SessionUser> {
  const response = await fetch(`${BASE_URL}/auth/login/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new AdminApiError(
      response.status,
      response.status === 401
        ? 'Incorrect username or password.'
        : describe(response.status, payload),
      payload,
    );
  }

  accessToken = (payload as { access: string }).access;
  return adminFetch<SessionUser>('/auth/me/');
}

export async function logout(): Promise<void> {
  try {
    await adminFetch('/auth/logout/', { method: 'POST' });
  } finally {
    // Cleared even if the call fails: the local session is over either way.
    accessToken = null;
  }
}

/**
 * Restore a session on page load.
 *
 * The access token does not survive a reload, so the console starts by asking
 * the refresh cookie whether anyone is still signed in.
 */
export async function restoreSession(): Promise<SessionUser | null> {
  const token = await refreshAccessToken();
  if (!token) return null;

  try {
    return await adminFetch<SessionUser>('/auth/me/');
  } catch {
    return null;
  }
}
