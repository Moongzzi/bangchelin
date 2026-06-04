const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number;
  user: {
    id: string;
    email?: string;
  };
};

type RequestOptions = {
  method?: string;
  token?: string | null;
  headers?: Record<string, string>;
  body?: unknown;
};

const sessionStorageKey = 'bangchelin.supabase.session';
const tokenExpiryLeewaySeconds = 30;

type SessionPersistence = 'local' | 'session';

function assertSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase 환경변수 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 설정해주세요.');
  }
}

function buildHeaders(token?: string | null, headers?: Record<string, string>) {
  assertSupabaseConfig();
  const anonKey = supabaseAnonKey;

  if (!anonKey) {
    throw new Error('Supabase anon key를 찾을 수 없습니다.');
  }

  return {
    apikey: anonKey,
    Authorization: `Bearer ${token || anonKey}`,
    ...headers,
  };
}

async function readResponse<T>(response: Response) {
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const expectsJson = contentType.includes('application/json') || contentType.includes('application/vnd.pgrst');

  if (text && !expectsJson) {
    throw new Error('Supabase API response was not JSON. Check VITE_SUPABASE_URL in the deployment environment.');
  }

  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error_description || data?.hint || response.statusText;
    throw new Error(message);
  }

  return data as T;
}

function normalizeSession(session: SupabaseSession) {
  return {
    ...session,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in,
  };
}

function isAccessTokenExpired(session: SupabaseSession) {
  if (!session.expires_at) {
    return false;
  }

  return session.expires_at - tokenExpiryLeewaySeconds <= Math.floor(Date.now() / 1000);
}

async function refreshStoredSession() {
  const currentSession = getSession();
  const currentPersistence = getSessionPersistence();

  if (!currentSession?.refresh_token) {
    return null;
  }

  assertSupabaseConfig();

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: buildHeaders(null, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      refresh_token: currentSession.refresh_token,
    }),
  });

  const nextSession = await readResponse<SupabaseSession>(response);
  saveSession(nextSession, currentPersistence === 'local');
  return getSession();
}

async function getRequestToken(token?: string | null) {
  const currentSession = getSession();

  if (!token || !currentSession || token !== currentSession.access_token) {
    return token;
  }

  if (!isAccessTokenExpired(currentSession)) {
    return token;
  }

  const refreshedSession = await refreshStoredSession();
  return refreshedSession?.access_token ?? token;
}

export async function authRequest<T>(path: string, body: unknown) {
  assertSupabaseConfig();

  const response = await fetch(`${supabaseUrl}/auth/v1${path}`, {
    method: 'POST',
    headers: buildHeaders(null, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(body),
  });

  return readResponse<T>(response);
}

export async function restRequest<T>(path: string, options: RequestOptions = {}) {
  assertSupabaseConfig();

  const requestToken = await getRequestToken(options.token);
  const response = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    method: options.method ?? 'GET',
    headers: buildHeaders(requestToken, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers,
    }),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 401 && options.token) {
    const refreshedSession = await refreshStoredSession();

    if (refreshedSession?.access_token) {
      const retryResponse = await fetch(`${supabaseUrl}/rest/v1${path}`, {
        method: options.method ?? 'GET',
        headers: buildHeaders(refreshedSession.access_token, {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
          ...options.headers,
        }),
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });

      return readResponse<T>(retryResponse);
    }
  }

  return readResponse<T>(response);
}

export async function uploadStorageObject(bucket: string, path: string, file: File, token: string) {
  assertSupabaseConfig();

  const requestToken = await getRequestToken(token);
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: buildHeaders(requestToken, {
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true',
    }),
    body: file,
  });

  if (response.status === 401) {
    const refreshedSession = await refreshStoredSession();

    if (refreshedSession?.access_token) {
      const retryResponse = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: buildHeaders(refreshedSession.access_token, {
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'true',
        }),
        body: file,
      });

      await readResponse(retryResponse);
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
    }
  }

  await readResponse(response);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

function getStoredSession(storage: Storage) {
  const rawSession = storage.getItem(sessionStorageKey);

  if (!rawSession) {
    return null;
  }

  try {
    return normalizeSession(JSON.parse(rawSession) as SupabaseSession);
  } catch {
    storage.removeItem(sessionStorageKey);
    return null;
  }
}

function getSessionPersistence(): SessionPersistence | null {
  if (window.localStorage.getItem(sessionStorageKey)) {
    return 'local';
  }

  if (window.sessionStorage.getItem(sessionStorageKey)) {
    return 'session';
  }

  return null;
}

export function saveSession(session: SupabaseSession, keepSignedIn = false) {
  const storage = keepSignedIn ? window.localStorage : window.sessionStorage;
  const inactiveStorage = keepSignedIn ? window.sessionStorage : window.localStorage;

  storage.setItem(sessionStorageKey, JSON.stringify(normalizeSession(session)));
  inactiveStorage.removeItem(sessionStorageKey);
}

export function getSession() {
  return getStoredSession(window.localStorage) ?? getStoredSession(window.sessionStorage);
}

export function clearSession() {
  window.localStorage.removeItem(sessionStorageKey);
  window.sessionStorage.removeItem(sessionStorageKey);
}
