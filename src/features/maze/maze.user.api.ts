import { getSession, restRequest, uploadStorageObject } from '../../shared/api/supabaseRest';
import type { MazeQuizSetStatus } from './types/maze.types';

const loungeAssetBucket = 'lounge-assets';

export type MyMazeSet = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  coverImageUrl: string;
  difficultyLabel: string;
  estimatedMinutes: string;
  status: MazeQuizSetStatus;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateMyMazeInput = {
  title: string;
  summary: string;
  description: string;
  coverImageUrl: string;
  difficultyLabel: string;
  estimatedMinutes: string;
};

export type UpdateMyMazeInput = CreateMyMazeInput & {
  status: MazeQuizSetStatus;
};

export type MyMazeQuestion = {
  id: string;
  setId: string;
  questionNo: number;
  title: string;
  isStart: boolean;
};

export type MyMazeAnswerRoute = {
  id: string;
  questionId: string;
  answerText: string;
  targetQuestionId: string;
  isEnding: boolean;
  sortOrder: number;
};

type MyMazeSetRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  cover_image_url: string | null;
  difficulty_label: string | null;
  estimated_minutes: number | null;
  status: MazeQuizSetStatus;
  created_at: string;
  updated_at: string;
  maze_questions?: Array<{ id: string }> | null;
};

type MyMazeQuestionRow = {
  id: string;
  set_id: string;
  question_no: number;
  title: string | null;
  is_start: boolean;
};

type MyMazeAnswerRouteRow = {
  id: string;
  question_id: string;
  answer_text: string;
  target_question_id: string | null;
  is_ending: boolean;
  sort_order: number;
};

function getRequiredSession() {
  const session = getSession();

  if (!session) {
    throw new Error('로그인이 필요합니다.');
  }

  return session;
}

function normalizeSlugPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
}

function createDraftSlug(title: string) {
  const titlePart = normalizeSlugPart(title) || 'maze';
  return `my-${titlePart}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

function toMyMazeSet(row: MyMazeSetRow): MyMazeSet {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? '',
    description: row.description ?? '',
    coverImageUrl: row.cover_image_url ?? '',
    difficultyLabel: row.difficulty_label ?? '',
    estimatedMinutes: row.estimated_minutes === null ? '' : String(row.estimated_minutes),
    status: row.status,
    questionCount: row.maze_questions?.length ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMyMazeQuestion(row: MyMazeQuestionRow): MyMazeQuestion {
  return {
    id: row.id,
    setId: row.set_id,
    questionNo: row.question_no,
    title: row.title?.trim() || `${row.question_no}번 문제`,
    isStart: row.is_start,
  };
}

function toMyMazeAnswerRoute(row: MyMazeAnswerRouteRow): MyMazeAnswerRoute {
  return {
    id: row.id,
    questionId: row.question_id,
    answerText: row.answer_text,
    targetQuestionId: row.target_question_id ?? '',
    isEnding: row.is_ending,
    sortOrder: row.sort_order,
  };
}

function validateCreateInput(input: CreateMyMazeInput) {
  if (!input.title.trim()) {
    throw new Error('미궁 제목을 입력해주세요.');
  }

  if (!input.summary.trim()) {
    throw new Error('미궁 요약을 입력해주세요.');
  }

  if (!input.description.trim()) {
    throw new Error('미궁 내용을 입력해주세요.');
  }

  if (!input.difficultyLabel.trim()) {
    throw new Error('난이도를 입력해주세요.');
  }

  if (!input.estimatedMinutes.trim() || Number(input.estimatedMinutes) <= 0) {
    throw new Error('예상 시간을 1분 이상으로 입력해주세요.');
  }
}

export async function getMyMazeSets() {
  const session = getRequiredSession();
  const rows = await restRequest<MyMazeSetRow[]>(
    `/maze_quiz_sets?created_by=eq.${session.user.id}&select=id,slug,title,summary,description,cover_image_url,difficulty_label,estimated_minutes,status,created_at,updated_at,maze_questions(id)&order=updated_at.desc`,
    {
      token: session.access_token,
    },
  );

  return rows.map(toMyMazeSet);
}

export async function getMyMazeSet(setId: string) {
  const session = getRequiredSession();
  const [row] = await restRequest<MyMazeSetRow[]>(
    `/maze_quiz_sets?id=eq.${setId}&created_by=eq.${session.user.id}&select=id,slug,title,summary,description,cover_image_url,difficulty_label,estimated_minutes,status,created_at,updated_at,maze_questions(id)`,
    {
      token: session.access_token,
    },
  );

  return row ? toMyMazeSet(row) : null;
}

export async function createMyMazeSet(input: CreateMyMazeInput) {
  const session = getRequiredSession();
  validateCreateInput(input);

  const now = new Date().toISOString();
  const [row] = await restRequest<MyMazeSetRow[]>('/maze_quiz_sets', {
    method: 'POST',
    token: session.access_token,
    body: {
      slug: createDraftSlug(input.title),
      title: input.title.trim(),
      summary: input.summary.trim(),
      description: input.description.trim(),
      cover_image_url: input.coverImageUrl.trim() || null,
      difficulty_label: input.difficultyLabel.trim(),
      estimated_minutes: Number(input.estimatedMinutes),
      status: 'draft',
      sort_order: 0,
      created_by: session.user.id,
      created_at: now,
      updated_at: now,
    },
  });

  if (!row) {
    throw new Error('미궁 정보를 저장하지 못했습니다.');
  }

  return toMyMazeSet(row);
}

export async function updateMyMazeSet(setId: string, input: UpdateMyMazeInput) {
  const session = getRequiredSession();
  validateCreateInput(input);

  const [row] = await restRequest<MyMazeSetRow[]>(
    `/maze_quiz_sets?id=eq.${setId}&created_by=eq.${session.user.id}`,
    {
      method: 'PATCH',
      token: session.access_token,
      body: {
        title: input.title.trim(),
        summary: input.summary.trim(),
        description: input.description.trim(),
        cover_image_url: input.coverImageUrl.trim() || null,
        difficulty_label: input.difficultyLabel.trim(),
        estimated_minutes: Number(input.estimatedMinutes),
        status: input.status,
        updated_at: new Date().toISOString(),
      },
    },
  );

  if (!row) {
    throw new Error('미궁 정보를 저장하지 못했습니다.');
  }

  return toMyMazeSet(row);
}

export async function getMyMazeQuestions(setId: string) {
  const session = getRequiredSession();
  const rows = await restRequest<MyMazeQuestionRow[]>(
    `/maze_questions?set_id=eq.${setId}&select=id,set_id,question_no,title,is_start&order=question_no.asc`,
    {
      token: session.access_token,
    },
  );

  return rows.map(toMyMazeQuestion);
}

export async function saveMyMazeQuestionOrder(questions: MyMazeQuestion[]) {
  const session = getRequiredSession();

  await Promise.all(questions.map((question, index) => (
    restRequest(`/maze_questions?id=eq.${question.id}`, {
      method: 'PATCH',
      token: session.access_token,
      body: {
        question_no: index + 1,
        updated_at: new Date().toISOString(),
      },
      headers: {
        Prefer: 'return=minimal',
      },
    })
  )));
}

export async function setMyMazeStartQuestion(setId: string, questionId: string) {
  const session = getRequiredSession();

  await restRequest(`/maze_questions?set_id=eq.${setId}`, {
    method: 'PATCH',
    token: session.access_token,
    body: {
      is_start: false,
      updated_at: new Date().toISOString(),
    },
    headers: {
      Prefer: 'return=minimal',
    },
  });

  await restRequest(`/maze_questions?id=eq.${questionId}`, {
    method: 'PATCH',
    token: session.access_token,
    body: {
      is_start: true,
      updated_at: new Date().toISOString(),
    },
    headers: {
      Prefer: 'return=minimal',
    },
  });
}

export async function deleteMyMazeQuestion(questionId: string) {
  const session = getRequiredSession();

  await restRequest(`/maze_questions?id=eq.${questionId}`, {
    method: 'DELETE',
    token: session.access_token,
    headers: {
      Prefer: 'return=minimal',
    },
  });
}

export async function getMyMazeAnswerRoutes(setId: string) {
  const questions = await getMyMazeQuestions(setId);
  const questionIds = questions.map((question) => question.id);

  if (questionIds.length === 0) {
    return [];
  }

  const session = getRequiredSession();
  const rows = await restRequest<MyMazeAnswerRouteRow[]>(
    `/maze_question_answer_routes?question_id=in.(${questionIds.join(',')})&select=id,question_id,answer_text,target_question_id,is_ending,sort_order&order=sort_order.asc`,
    {
      token: session.access_token,
    },
  );

  return rows.map(toMyMazeAnswerRoute);
}

export async function saveMyMazeAnswerRoutes(questionId: string, routes: MyMazeAnswerRoute[]) {
  const session = getRequiredSession();

  await restRequest(`/maze_question_answer_routes?question_id=eq.${questionId}`, {
    method: 'DELETE',
    token: session.access_token,
    headers: {
      Prefer: 'return=minimal',
    },
  });

  const now = new Date().toISOString();
  const rows = routes
    .map((route, index) => ({
      question_id: questionId,
      answer_text: route.answerText.trim(),
      target_question_id: route.isEnding ? null : route.targetQuestionId || null,
      is_ending: route.isEnding,
      sort_order: index + 1,
      created_at: now,
      updated_at: now,
    }))
    .filter((route) => route.answer_text && (route.is_ending || route.target_question_id));

  if (rows.length === 0) {
    return [];
  }

  const savedRows = await restRequest<MyMazeAnswerRouteRow[]>('/maze_question_answer_routes', {
    method: 'POST',
    token: session.access_token,
    body: rows,
  });

  return savedRows.map(toMyMazeAnswerRoute);
}

export async function uploadMyMazeCover(file: File) {
  const session = getRequiredSession();
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const objectPath = `maze-custom/${session.user.id}/cover-${Date.now()}-${crypto.randomUUID()}.${extension}`;

  return uploadStorageObject(loungeAssetBucket, objectPath, file, session.access_token);
}
