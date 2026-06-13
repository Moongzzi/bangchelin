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
  logActivity?: boolean;
};

const sessionStorageKey = 'bangchelin.supabase.session';
const tokenExpiryLeewaySeconds = 30;
const activityLogRpcPath = '/rpc/log_user_activity';
const sensitiveActivityKeys = new Set([
  'access_token',
  'apikey',
  'api_key',
  'authorization',
  'auth_email',
  'password',
  'refresh_token',
  'token',
]);

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

function sanitizeActivityPayload(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeActivityPayload);
  }

  if (typeof value === 'object') {
    if (value instanceof File) {
      return {
        name: value.name,
        size: value.size,
        type: value.type,
      };
    }

    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((payload, [key, entryValue]) => {
      if (sensitiveActivityKeys.has(key.toLowerCase())) {
        return payload;
      }

      payload[key] = sanitizeActivityPayload(entryValue);
      return payload;
    }, {});
  }

  return value;
}

function getEntityTypeFromPath(path: string) {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const [resource] = normalizedPath.split('?');

  if (resource === 'rpc') {
    const [, rpcName] = normalizedPath.split('/');
    return rpcName ? `rpc:${rpcName.split('?')[0]}` : 'rpc';
  }

  return resource || 'unknown';
}

function getEntityIdFromPath(path: string) {
  const idMatch = path.match(/[?&]id=eq\.([^&]+)/);
  return idMatch?.[1] ? decodeURIComponent(idMatch[1]) : null;
}

function getActionType(method: string, path: string) {
  const entityType = getEntityTypeFromPath(path);
  const normalizedMethod = method.toUpperCase();

  if (entityType.startsWith('rpc:')) {
    return entityType.replace(':', '.');
  }

  if (normalizedMethod === 'GET') {
    return `${entityType}.read`;
  }

  if (normalizedMethod === 'POST') {
    return `${entityType}.create`;
  }

  if (normalizedMethod === 'PATCH') {
    return `${entityType}.update`;
  }

  if (normalizedMethod === 'DELETE') {
    return `${entityType}.delete`;
  }

  return `${entityType}.${normalizedMethod.toLowerCase()}`;
}

async function writeActivityLog(input: {
  token?: string | null;
  actionType: string;
  method: string;
  endpoint: string;
  success: boolean;
  httpStatus?: number | null;
  entityType?: string | null;
  entityId?: string | null;
  requestPayload?: unknown;
  responsePayload?: unknown;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
  source?: string;
}) {
  if (!input.token || !supabaseUrl) {
    return;
  }

  try {
    await fetch(`${supabaseUrl}/rest/v1${activityLogRpcPath}`, {
      method: 'POST',
      headers: buildHeaders(input.token, {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      }),
      body: JSON.stringify({
        p_action_type: input.actionType,
        p_method: input.method.toUpperCase(),
        p_endpoint: input.endpoint,
        p_success: input.success,
        p_http_status: input.httpStatus ?? null,
        p_entity_type: input.entityType ?? null,
        p_entity_id: input.entityId ?? null,
        p_request_payload: sanitizeActivityPayload(input.requestPayload) ?? null,
        p_response_payload: sanitizeActivityPayload(input.responsePayload) ?? null,
        p_error_message: input.errorMessage ?? null,
        p_metadata: input.metadata ?? {},
        p_user_agent: window.navigator.userAgent,
        p_page_path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        p_source: input.source ?? 'client_rest',
      }),
    });
  } catch {
    // Activity logging should never block the user-facing request.
  }
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
  const method = options.method ?? 'GET';
  let activityToken = requestToken;
  let response = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    method,
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
      activityToken = refreshedSession.access_token;
      response = await fetch(`${supabaseUrl}/rest/v1${path}`, {
        method,
        headers: buildHeaders(refreshedSession.access_token, {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
          ...options.headers,
        }),
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    }
  }

  try {
    const data = await readResponse<T>(response);

    if (options.logActivity !== false && path !== activityLogRpcPath) {
      await writeActivityLog({
        token: activityToken,
        actionType: getActionType(method, path),
        method,
        endpoint: `/rest/v1${path}`,
        success: true,
        httpStatus: response.status,
        entityType: getEntityTypeFromPath(path),
        entityId: getEntityIdFromPath(path),
        requestPayload: options.body,
      });
    }

    return data;
  } catch (error) {
    if (options.logActivity !== false && path !== activityLogRpcPath) {
      await writeActivityLog({
        token: activityToken,
        actionType: getActionType(method, path),
        method,
        endpoint: `/rest/v1${path}`,
        success: false,
        httpStatus: response.status,
        entityType: getEntityTypeFromPath(path),
        entityId: getEntityIdFromPath(path),
        requestPayload: options.body,
        errorMessage: error instanceof Error ? error.message : 'Unknown Supabase REST error',
      });
    }

    throw error;
  }
}

export async function uploadStorageObject(bucket: string, path: string, file: File, token: string) {
  assertSupabaseConfig();

  const requestToken = await getRequestToken(token);
  let activityToken = requestToken;
  let response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
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
      activityToken = refreshedSession.access_token;
      response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: buildHeaders(refreshedSession.access_token, {
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'true',
        }),
        body: file,
      });
    }
  }

  try {
    await readResponse(response);
    await writeActivityLog({
      token: activityToken,
      actionType: 'storage_objects.upload',
      method: 'POST',
      endpoint: `/storage/v1/object/${bucket}/${path}`,
      success: true,
      httpStatus: response.status,
      entityType: 'storage_object',
      entityId: `${bucket}/${path}`,
      requestPayload: file,
      source: 'client_storage',
    });

    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  } catch (error) {
    await writeActivityLog({
      token: activityToken,
      actionType: 'storage_objects.upload',
      method: 'POST',
      endpoint: `/storage/v1/object/${bucket}/${path}`,
      success: false,
      httpStatus: response.status,
      entityType: 'storage_object',
      entityId: `${bucket}/${path}`,
      requestPayload: file,
      errorMessage: error instanceof Error ? error.message : 'Unknown Supabase storage error',
      source: 'client_storage',
    });

    throw error;
  }
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
