import { functionRequest, getSession, restRequest } from '../../shared/api/supabaseRest';

export type AdminUserSummary = {
  id: string;
  username: string;
  nickname: string;
  email: string;
  role: 'user' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  lastSignInAt: string;
  lastActivityAt: string;
  isOnline: boolean;
  activityCount: number;
};

export type AdminUserActivityLog = {
  id: string;
  userId: string | null;
  actionType: string;
  source: string;
  method: string;
  endpoint: string;
  httpStatus: number | null;
  success: boolean;
  entityType: string;
  entityId: string;
  pagePath: string;
  errorMessage: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type AdminUserSummaryRow = {
  id: string;
  username: string | null;
  nickname: string | null;
  email: string | null;
  role: 'user' | 'admin' | string | null;
  approval_status: 'pending' | 'approved' | 'rejected' | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  last_sign_in_at: string | null;
  last_activity_at: string | null;
  is_online: boolean | null;
  activity_count: number | string | null;
};

type AdminUserActivityLogRow = {
  id: string;
  user_id: string | null;
  action_type: string | null;
  source: string | null;
  method: string | null;
  endpoint: string | null;
  http_status: number | null;
  success: boolean | null;
  entity_type: string | null;
  entity_id: string | null;
  page_path: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type DeleteUserResponse = {
  ok: boolean;
};

function getRequiredSession() {
  const session = getSession();

  if (!session) {
    throw new Error('로그인이 필요한 기능입니다.');
  }

  return session;
}

function toAdminUserSummary(row: AdminUserSummaryRow): AdminUserSummary {
  return {
    id: row.id,
    username: row.username?.trim() || '',
    nickname: row.nickname?.trim() || '알 수 없음',
    email: row.email?.trim() || '',
    role: row.role === 'admin' ? 'admin' : 'user',
    approvalStatus: row.approval_status ?? 'pending',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at ?? '',
    lastSignInAt: row.last_sign_in_at ?? '',
    lastActivityAt: row.last_activity_at ?? '',
    isOnline: Boolean(row.is_online),
    activityCount: Number(row.activity_count ?? 0),
  };
}

function toAdminUserActivityLog(row: AdminUserActivityLogRow): AdminUserActivityLog {
  return {
    id: row.id,
    userId: row.user_id,
    actionType: row.action_type?.trim() || 'unknown',
    source: row.source?.trim() || '',
    method: row.method?.trim() || '',
    endpoint: row.endpoint?.trim() || '',
    httpStatus: row.http_status,
    success: row.success ?? true,
    entityType: row.entity_type?.trim() || '',
    entityId: row.entity_id?.trim() || '',
    pagePath: row.page_path?.trim() || '',
    errorMessage: row.error_message?.trim() || '',
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export async function getAdminUsers() {
  const session = getRequiredSession();
  const rows = await restRequest<AdminUserSummaryRow[]>('/rpc/get_admin_user_summaries', {
    method: 'POST',
    token: session.access_token,
    body: {
      p_online_window_minutes: 5,
    },
  });

  return rows.map(toAdminUserSummary);
}

export async function getAdminUserActivityLogs(userId: string, page = 0, pageSize = 50) {
  const session = getRequiredSession();
  const limit = Math.max(1, Math.min(pageSize, 100));
  const offset = Math.max(0, page) * limit;
  const rows = await restRequest<AdminUserActivityLogRow[]>(
    `/user_activity_logs?user_id=eq.${encodeURIComponent(userId)}&select=id,user_id,action_type,source,method,endpoint,http_status,success,entity_type,entity_id,page_path,error_message,metadata,created_at&order=created_at.desc&limit=${limit}&offset=${offset}`,
    {
      token: session.access_token,
    },
  );

  return rows.map(toAdminUserActivityLog);
}

export async function deleteAdminUser(userId: string) {
  const session = getRequiredSession();

  const response = await functionRequest<DeleteUserResponse>('admin-delete-user', {
    method: 'POST',
    token: session.access_token,
    body: {
      userId,
    },
  });

  if (!response.ok) {
    throw new Error('유저 계정을 삭제하지 못했습니다.');
  }

  return response;
}
