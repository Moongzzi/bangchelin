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
  created_at: string;
  updated_at: string;
};

type ProfileNicknameRow = {
  nickname: string | null;
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
