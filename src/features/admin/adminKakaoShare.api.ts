import { getSession, restRequest, uploadStorageObject } from '../../shared/api/supabaseRest';

export type AdminKakaoShareCategory = 'notice' | 'update';

export type AdminKakaoShareMessage = {
  id: string;
  category: AdminKakaoShareCategory;
  templateId: number;
  profileName: string;
  title: string;
  content: string;
  items: string[];
  imageUrl: string;
  imageUrls: string[];
  targetUrl: string;
  buttonUrl1: string;
  buttonUrl2: string;
  buttonText1: string;
  buttonText2: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminKakaoShareMessageInput = {
  category: AdminKakaoShareCategory;
  templateId: number;
  profileName: string;
  title?: string;
  content?: string;
  items?: string[];
  imageUrl?: string;
  imageUrls?: string[];
  targetUrl?: string;
  buttonUrl1?: string;
  buttonUrl2?: string;
  buttonText1?: string;
  buttonText2?: string;
};

type AdminKakaoShareMessageRow = {
  id: string;
  category: AdminKakaoShareCategory;
  template_id: number;
  profile_name: string;
  title: string | null;
  content: string | null;
  items: string[] | null;
  image_url: string | null;
  image_urls: string[] | null;
  target_url: string | null;
  button_url_1: string | null;
  button_url_2: string | null;
  button_text_1: string | null;
  button_text_2: string | null;
  created_at: string;
  updated_at: string;
};

const kakaoShareAssetBucket = 'admin-kakao-share-assets';

function getRequiredSession() {
  const session = getSession();

  if (!session) {
    throw new Error('로그인이 필요한 기능입니다.');
  }

  return session;
}

function toAdminKakaoShareMessage(row: AdminKakaoShareMessageRow): AdminKakaoShareMessage {
  const imageUrls = normalizeImageUrls(row.image_urls ?? (row.image_url ? [row.image_url] : []));

  return {
    id: row.id,
    category: row.category,
    templateId: Number(row.template_id),
    profileName: row.profile_name,
    title: row.title ?? '',
    content: row.content ?? '',
    items: row.items ?? [],
    imageUrl: imageUrls[0] ?? '',
    imageUrls,
    targetUrl: row.target_url ?? '',
    buttonUrl1: row.button_url_1 ?? '',
    buttonUrl2: row.button_url_2 ?? '',
    buttonText1: row.button_text_1 ?? '',
    buttonText2: row.button_text_2 ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeItems(items: string[] = []) {
  return items
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeImageUrls(imageUrls: string[] = []) {
  return imageUrls
    .map((imageUrl) => imageUrl.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export async function getAdminKakaoShareMessages() {
  const session = getRequiredSession();
  const rows = await restRequest<AdminKakaoShareMessageRow[]>(
    '/admin_kakao_share_messages?select=id,category,template_id,profile_name,title,content,items,image_url,image_urls,target_url,button_url_1,button_url_2,button_text_1,button_text_2,created_at,updated_at&order=created_at.desc&limit=20',
    {
      token: session.access_token,
    },
  );

  return rows.map(toAdminKakaoShareMessage);
}

export async function createAdminKakaoShareMessage(input: AdminKakaoShareMessageInput) {
  const session = getRequiredSession();
  const imageUrls = normalizeImageUrls(input.imageUrls ?? (input.imageUrl ? [input.imageUrl] : []));
  const [row] = await restRequest<AdminKakaoShareMessageRow[]>('/admin_kakao_share_messages', {
    method: 'POST',
    token: session.access_token,
    body: {
      category: input.category,
      template_id: input.templateId,
      profile_name: input.profileName,
      title: input.title?.trim() || null,
      content: input.content?.trim() || null,
      items: normalizeItems(input.items),
      image_url: imageUrls[0] ?? null,
      image_urls: imageUrls,
      target_url: input.targetUrl?.trim() || null,
      button_url_1: input.buttonUrl1?.trim() || null,
      button_url_2: input.buttonUrl2?.trim() || null,
      button_text_1: input.buttonText1?.trim() || null,
      button_text_2: input.buttonText2?.trim() || null,
    },
  });

  if (!row) {
    throw new Error('카카오 공유 메시지 저장 결과를 확인하지 못했습니다.');
  }

  return toAdminKakaoShareMessage(row);
}

export async function uploadAdminKakaoShareImage(file: File) {
  const session = getRequiredSession();
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const objectPath = `messages/image-${Date.now()}-${crypto.randomUUID()}.${extension}`;

  return uploadStorageObject(kakaoShareAssetBucket, objectPath, file, session.access_token);
}
