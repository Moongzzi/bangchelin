import { getSession, restRequest } from '../../shared/api/supabaseRest';
import type { GuideCategory, GuideDocument } from '../../pages/about/aboutData';

type GuideDocumentRow = {
  id: string;
  slug: string;
  title: string;
  content: GuideCategory[];
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type GuideDocumentUpdateInput = {
  slug: string;
  title: string;
  content: GuideCategory[];
  sortOrder?: number;
};

function toGuideDocument(row: GuideDocumentRow): GuideDocument {
  return {
    id: row.slug,
    title: row.title,
    categories: row.content,
  };
}

export async function getGuideDocuments() {
  const rows = await restRequest<GuideDocumentRow[]>(
    '/guide_documents?is_published=eq.true&select=id,slug,title,content,sort_order,is_published,created_at,updated_at,published_at&order=sort_order.asc',
  );

  return rows.map(toGuideDocument);
}

export async function updateGuideDocument(input: GuideDocumentUpdateInput) {
  const session = getSession();

  if (!session) {
    throw new Error('로그인이 필요한 기능입니다.');
  }

  const [row] = await restRequest<GuideDocumentRow[]>(`/guide_documents?slug=eq.${encodeURIComponent(input.slug)}`, {
    method: 'PATCH',
    token: session.access_token,
    body: {
      title: input.title,
      content: input.content,
    },
  });

  if (!row) {
    throw new Error('가이드 문서 저장 결과를 확인할 수 없습니다.');
  }

  return toGuideDocument(row);
}

export async function upsertGuideDocument(input: GuideDocumentUpdateInput) {
  const session = getSession();

  if (!session) {
    throw new Error('로그인이 필요한 기능입니다.');
  }

  const [row] = await restRequest<GuideDocumentRow[]>('/guide_documents?on_conflict=slug', {
    method: 'POST',
    token: session.access_token,
    body: {
      slug: input.slug,
      title: input.title,
      content: input.content,
      sort_order: input.sortOrder ?? 0,
      is_published: true,
      published_at: new Date().toISOString(),
    },
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
  });

  if (!row) {
    throw new Error('가이드 문서 저장 결과를 확인할 수 없습니다.');
  }

  return toGuideDocument(row);
}

export async function unpublishGuideDocuments(slugs: string[]) {
  const session = getSession();

  if (!session || !slugs.length) {
    return [];
  }

  const encodedSlugs = slugs.map((slug) => `"${slug.replace(/"/g, '\\"')}"`).join(',');
  const rows = await restRequest<GuideDocumentRow[]>(`/guide_documents?slug=in.(${encodedSlugs})`, {
    method: 'PATCH',
    token: session.access_token,
    body: {
      is_published: false,
    },
  });

  return rows.map(toGuideDocument);
}
