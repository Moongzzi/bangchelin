import { getSession, restRequest } from '../../shared/api/supabaseRest';
import type { InquiryDraftData, InquiryFormData } from '../../pages/report/reportConfig';

type InquiryDraftRow = {
  id: string;
  category: string;
  subject: string;
  message: string;
  updated_at: string;
};

type InquiryRow = {
  id: string;
  user_id: string;
  nickname: string;
  category: string;
  subject: string;
  message: string;
  status: 'submitted' | 'reviewing' | 'resolved' | 'rejected';
  admin_note?: string | null;
  handled_by?: string | null;
  handled_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminInquiryListItem = {
  id: string;
  category: string;
  subject: string;
  nickname: string;
  status: InquiryRow['status'];
  createdAt: string;
};

export type MyInquiryListItem = {
  id: string;
  category: string;
  subject: string;
  status: InquiryRow['status'];
  createdAt: string;
  updatedAt: string;
};

export type MyInquiryDetail = MyInquiryListItem & {
  message: string;
  adminNote: string;
  handledAt: string;
};

export type AdminInquiryDetail = AdminInquiryListItem & {
  message: string;
  adminNote: string;
  handledBy: string;
};

export type AdminProfileOption = {
  id: string;
  nickname: string;
  username: string;
};

export type UpdateAdminInquiryInput = {
  id: string;
  handledBy: string;
  status: Exclude<InquiryRow['status'], 'submitted'>;
  adminNote: string;
};

type ProfileNicknameRow = {
  nickname: string | null;
};

type AdminProfileRow = {
  id: string;
  nickname: string | null;
  username: string | null;
};

function getRequiredSession() {
  const session = getSession();

  if (!session) {
    throw new Error('로그인이 필요한 기능입니다.');
  }

  return session;
}

async function getMyNickname(token: string, userId: string) {
  const [profile] = await restRequest<ProfileNicknameRow[]>(`/profiles?id=eq.${userId}&select=nickname`, {
    token,
  });

  const nickname = profile?.nickname?.trim();
  if (!nickname) {
    throw new Error('프로필 닉네임을 확인할 수 없습니다.');
  }

  return nickname;
}

function toInquiryPayload(formData: InquiryFormData, nickname: string) {
  return {
    nickname,
    category: formData.category,
    subject: formData.subject.trim(),
    message: formData.message.trim(),
  };
}

function toInquiryDraft(row: InquiryDraftRow): InquiryDraftData {
  return {
    category: row.category,
    subject: row.subject,
    message: row.message,
    updatedAt: row.updated_at,
  };
}

export async function getInquiryDraft() {
  const session = getRequiredSession();
  const [row] = await restRequest<InquiryDraftRow[]>(
    '/inquiry_drafts?select=id,category,subject,message,updated_at',
    {
      token: session.access_token,
    },
  );

  return row ? toInquiryDraft(row) : null;
}

export async function saveInquiryDraft(formData: InquiryFormData) {
  const session = getRequiredSession();
  const nickname = await getMyNickname(session.access_token, session.user.id);
  const [row] = await restRequest<InquiryDraftRow[]>('/inquiry_drafts?on_conflict=user_id', {
    method: 'POST',
    token: session.access_token,
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: {
      user_id: session.user.id,
      ...toInquiryPayload(formData, nickname),
    },
  });

  if (!row) {
    throw new Error('임시 저장 결과를 확인할 수 없습니다.');
  }

  return toInquiryDraft(row);
}

export async function clearInquiryDraft() {
  const session = getRequiredSession();

  await restRequest(`/inquiry_drafts?user_id=eq.${session.user.id}`, {
    method: 'DELETE',
    token: session.access_token,
    headers: {
      Prefer: 'return=minimal',
    },
  });
}

export async function submitInquiry(formData: InquiryFormData) {
  const session = getRequiredSession();
  const nickname = await getMyNickname(session.access_token, session.user.id);
  const [row] = await restRequest<InquiryRow[]>('/inquiries', {
    method: 'POST',
    token: session.access_token,
    body: {
      user_id: session.user.id,
      ...toInquiryPayload(formData, nickname),
    },
  });

  if (!row) {
    throw new Error('문의 전송 결과를 확인할 수 없습니다.');
  }

  return row;
}

export async function getMyInquiries() {
  const session = getRequiredSession();
  const userId = encodeURIComponent(session.user.id);
  const rows = await restRequest<InquiryRow[]>(
    `/inquiries?user_id=eq.${userId}&select=id,category,subject,status,created_at,updated_at&order=created_at.desc`,
    {
      token: session.access_token,
    },
  );

  return rows.map<MyInquiryListItem>((row) => ({
    id: row.id,
    category: row.category,
    subject: row.subject,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getMyInquiry(inquiryId: string) {
  const session = getRequiredSession();
  const userId = encodeURIComponent(session.user.id);
  const encodedInquiryId = encodeURIComponent(inquiryId);
  const [row] = await restRequest<InquiryRow[]>(
    `/inquiries?id=eq.${encodedInquiryId}&user_id=eq.${userId}&select=id,category,subject,message,status,admin_note,handled_at,created_at,updated_at`,
    {
      token: session.access_token,
    },
  );

  if (!row) {
    throw new Error('문의 상세 정보를 찾을 수 없습니다.');
  }

  return {
    id: row.id,
    category: row.category,
    subject: row.subject,
    message: row.message,
    status: row.status,
    adminNote: row.admin_note ?? '',
    handledAt: row.handled_at ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies MyInquiryDetail;
}

export async function getAdminInquiries() {
  const session = getRequiredSession();
  const rows = await restRequest<InquiryRow[]>(
    '/inquiries?select=id,category,subject,nickname,status,created_at,updated_at&order=created_at.desc',
    {
      token: session.access_token,
    },
  );

  return rows.map<AdminInquiryListItem>((row) => ({
    id: row.id,
    category: row.category,
    subject: row.subject,
    nickname: row.nickname,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function getAdminInquiry(inquiryId: string) {
  const session = getRequiredSession();
  const [row] = await restRequest<InquiryRow[]>(
    `/inquiries?id=eq.${inquiryId}&select=id,category,subject,nickname,message,status,admin_note,handled_by,created_at,updated_at`,
    {
      token: session.access_token,
    },
  );

  if (!row) {
    throw new Error('문의 상세 정보를 찾을 수 없습니다.');
  }

  return {
    id: row.id,
    category: row.category,
    subject: row.subject,
    nickname: row.nickname,
    message: row.message,
    status: row.status,
    adminNote: row.admin_note ?? '',
    handledBy: row.handled_by ?? '',
    createdAt: row.created_at,
  } satisfies AdminInquiryDetail;
}

export async function getAdminProfiles() {
  const session = getRequiredSession();
  const rows = await restRequest<AdminProfileRow[]>(
    '/profiles?role=eq.admin&select=id,nickname,username&order=nickname.asc',
    {
      token: session.access_token,
    },
  );

  return rows.map<AdminProfileOption>((row) => ({
    id: row.id,
    nickname: row.nickname?.trim() || row.username?.trim() || '관리자',
    username: row.username?.trim() || '',
  }));
}

export async function updateAdminInquiry(input: UpdateAdminInquiryInput) {
  const session = getRequiredSession();
  const [row] = await restRequest<InquiryRow[]>(`/inquiries?id=eq.${input.id}`, {
    method: 'PATCH',
    token: session.access_token,
    body: {
      handled_by: input.handledBy,
      status: input.status,
      admin_note: input.adminNote.trim(),
    },
  });

  if (!row) {
    throw new Error('문의 처리 상태를 저장하지 못했습니다.');
  }

  return row;
}
