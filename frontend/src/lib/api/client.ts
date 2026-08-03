import { defaultLocale, type Locale } from '@/lib/i18n/config';

const BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://127.0.0.1:8000/api/v1';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ApiRequestOptions = {
  locale?: Locale;
  /** Query string parameters; undefined values are dropped. */
  params?: Record<string, string | number | boolean | undefined>;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** ISR: seconds before revalidation, and cache tags for the webhook. */
  revalidate?: number | false;
  tags?: string[];
};

/**
 * Single entry point to the Django API. The locale travels in Accept-Language,
 * so the backend returns the right translation rows.
 */
export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { locale = defaultLocale, params, method = 'GET', body, revalidate, tags } = options;

  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Accept-Language': locale,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    next: revalidate === undefined && !tags ? undefined : { revalidate, tags },
  });

  if (!response.ok) {
    const details = await response.json().catch(() => undefined);
    throw new ApiError(response.status, `API ${method} ${path} failed`, details);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
