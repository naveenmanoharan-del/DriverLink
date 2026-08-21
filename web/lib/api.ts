const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  token?: string;
  body?: unknown;
}

/**
 * Supplied by the auth provider. Exchanges the stored refresh token for a new
 * access token, returning null when the session can no longer be renewed.
 */
type TokenRefresher = () => Promise<string | null>;

let tokenRefresher: TokenRefresher | null = null;
let inFlightRefresh: Promise<string | null> | null = null;

export function setTokenRefresher(fn: TokenRefresher | null) {
  tokenRefresher = fn;
}

/**
 * Runs the refresher, collapsing concurrent callers onto one request so a page
 * that fires several requests at once doesn't trigger a burst of refreshes
 * (which the auth rate limit would reject).
 */
function refreshAccessToken(): Promise<string | null> {
  if (!tokenRefresher) return Promise.resolve(null);
  inFlightRefresh ??= tokenRefresher().finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
}

function buildRequest(path: string, options: ApiFetchOptions, token?: string) {
  // `token` is passed separately so a retry can swap in a refreshed one, so
  // drop it from the spread rather than letting it reach fetch().
  const { body, headers, ...rest } = options;
  delete (rest as { token?: string }).token;
  return fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  let res = await buildRequest(path, options, options.token);

  // The access token is short-lived. On a 401 for an authenticated call, renew
  // it once and replay the request; without this the whole app starts failing
  // as soon as the token expires.
  if (res.status === 401 && options.token) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      res = await buildRequest(path, options, renewed);
    }
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message ?? res.statusText;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return data as T;
}
