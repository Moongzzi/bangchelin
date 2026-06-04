import {
  authRequest,
  clearSession,
  getSession,
  restRequest,
  saveSession,
  uploadStorageObject,
  type SupabaseSession,
} from '../../shared/api/supabaseRest';

export type ActivityRegion =
  | 'seoul'
  | 'incheon'
  | 'gyeonggi'
  | 'chungcheong'
  | 'gyeongsang'
  | 'jeolla'
  | 'gangwon'
  | 'jeju';

export type Profile = {
  id: string;
  username: string;
  nickname: string;
  avatar_url: string | null;
  birth_date: string | null;
  introduction: string | null;
  activity_region: ActivityRegion | null;
  email: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
};

export type SignUpInput = {
  username: string;
  password: string;
  nickname: string;
  avatarFile?: File | null;
  birthDate?: string;
  introduction?: string;
  activityRegion?: ActivityRegion | null;
  email?: string;
};

export type UpdateProfileInput = {
  nickname: string;
  avatarFile?: File | null;
  birthDate?: string;
  introduction?: string;
  activityRegion?: ActivityRegion | null;
  email?: string;
};

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user: {
    id: string;
    email?: string;
  };
};

const avatarBucket = 'profile-avatars';

function getAuthEmail(username: string) {
  const normalizedUsername = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._%+-]/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${normalizedUsername || crypto.randomUUID()}@users.bangchelin.com`;
}

function toProfilePayload(input: SignUpInput | UpdateProfileInput, avatarUrl?: string | null) {
  return {
    nickname: input.nickname.trim(),
    avatar_url: avatarUrl,
    birth_date: input.birthDate || null,
    introduction: input.introduction?.trim() || null,
    activity_region: input.activityRegion || null,
    email: input.email?.trim() || null,
  };
}

function normalizeSession(response: AuthResponse) {
  if (!response.access_token || !response.refresh_token || !response.expires_in || !response.token_type) {
    return null;
  }

  return response as SupabaseSession;
}

function toSignInErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return '비밀번호가 올바르지 않습니다.';
  }

  if (message.includes('email not confirmed')) {
    return '이 계정은 아직 인증이 완료되지 않았습니다.';
  }

  if (message.includes('too many requests') || message.includes('rate limit')) {
    return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }

  if (message.includes('network') || message.includes('failed to fetch')) {
    return '네트워크 연결을 확인한 뒤 다시 시도해주세요.';
  }

  return '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.';
}

export async function checkNicknameAvailable(nickname: string) {
  const [result] = await restRequest<Array<{ is_available: boolean }>>('/rpc/is_nickname_available', {
    method: 'POST',
    body: {
      p_nickname: nickname.trim(),
    },
  });

  return Boolean(result?.is_available);
}

export async function signUp(input: SignUpInput) {
  const authEmail = getAuthEmail(input.username);
  const response = await authRequest<AuthResponse>('/signup', {
    email: authEmail,
    password: input.password,
    data: {
      username: input.username.trim(),
      nickname: input.nickname.trim(),
      birth_date: input.birthDate || null,
      introduction: input.introduction?.trim() || null,
      activity_region: input.activityRegion || null,
      email: input.email?.trim() || null,
      auth_email: authEmail,
    },
  });

  const session = normalizeSession(response);

  if (!session) {
    return {
      session: null,
      profile: null,
    };
  }

  saveSession(session);

  let avatarUrl: string | null = null;
  if (input.avatarFile) {
    const extension = input.avatarFile.name.split('.').pop() || 'png';
    avatarUrl = await uploadStorageObject(avatarBucket, `${session.user.id}/avatar.${extension}`, input.avatarFile, session.access_token);
  }

  const [profile] = await restRequest<Profile[]>(`/profiles?id=eq.${session.user.id}`, {
    method: 'PATCH',
    token: session.access_token,
    body: {
      username: input.username.trim(),
      auth_email: authEmail,
      ...toProfilePayload(input, avatarUrl),
    },
  });

  return {
    session,
    profile,
  };
}

export async function signInWithUsername(username: string, password: string, keepSignedIn = false) {
  const [loginInfo] = await restRequest<Array<{ auth_email: string }>>('/rpc/get_login_email', {
    method: 'POST',
    body: {
      p_username: username.trim(),
    },
  });

  if (!loginInfo?.auth_email) {
    throw new Error('존재하지 않는 아이디입니다.');
  }

  let session: SupabaseSession;

  try {
    session = await authRequest<SupabaseSession>('/token?grant_type=password', {
      email: loginInfo.auth_email,
      password,
    });
  } catch (error) {
    throw new Error(toSignInErrorMessage(error));
  }

  saveSession(session, keepSignedIn);
  return session;
}

export function signOut() {
  clearSession();
}

export async function getMyProfile() {
  const session = getSession();

  if (!session) {
    return null;
  }

  const [profile] = await restRequest<Profile[]>(`/profiles?id=eq.${session.user.id}&select=*`, {
    token: session.access_token,
  });

  return profile ?? null;
}

export async function updateMyProfile(input: UpdateProfileInput) {
  const session = getSession();

  if (!session) {
    throw new Error('로그인이 필요합니다.');
  }

  let avatarUrl: string | null | undefined;
  if (input.avatarFile) {
    const extension = input.avatarFile.name.split('.').pop() || 'png';
    avatarUrl = await uploadStorageObject(avatarBucket, `${session.user.id}/avatar.${extension}`, input.avatarFile, session.access_token);
  }

  const payload = toProfilePayload(input, avatarUrl);
  if (avatarUrl === undefined) {
    delete payload.avatar_url;
  }

  const [profile] = await restRequest<Profile[]>(`/profiles?id=eq.${session.user.id}`, {
    method: 'PATCH',
    token: session.access_token,
    body: payload,
  });

  if (!profile) {
    throw new Error('프로필 저장 결과를 확인하지 못했습니다.');
  }

  return profile;
}
