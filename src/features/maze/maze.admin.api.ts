import { getSession, restRequest, uploadStorageObject } from '../../shared/api/supabaseRest';
import type { MazeQuizSetStatus } from './types/maze.types';

const loungeAssetBucket = 'lounge-assets';

export type AdminMazeQuizSet = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  coverImageUrl: string;
  hasStartPage: boolean;
  startImageUrl: string;
  startAnswerText: string;
  hasEndPage: boolean;
  endImageUrl: string;
  difficultyLabel: string;
  estimatedMinutes: string;
  status: MazeQuizSetStatus;
  sortOrder: number;
};

export type AdminMazeQuestion = {
  id: string;
  setId: string;
  questionNo: number;
  imageUrl: string;
  answerText: string;
};

export type AdminMazeQuizSetInput = Omit<AdminMazeQuizSet, 'id'> & {
  id?: string;
};

export type AdminMazeQuestionInput = {
  id?: string;
  setId: string;
  questionNo: number;
  imageUrl: string;
  answerText: string;
};

type AdminMazeQuizSetRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  cover_image_url: string | null;
  has_start_page: boolean;
  start_image_url: string | null;
  has_end_page: boolean;
  end_image_url: string | null;
  difficulty_label: string | null;
  estimated_minutes: number | null;
  status: MazeQuizSetStatus;
  sort_order: number;
  maze_start_answers?: { answer_text: string } | Array<{ answer_text: string }> | null;
};

type AdminMazeQuestionRow = {
  id: string;
  set_id: string;
  question_no: number;
  image_url: string;
  maze_question_answers?: { answer_text: string } | Array<{ answer_text: string }> | null;
};

function getRequiredSession() {
  const session = getSession();

  if (!session) {
    throw new Error('로그인이 필요합니다.');
  }

  return session;
}

function firstEmbedded<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toAdminMazeQuizSet(row: AdminMazeQuizSetRow): AdminMazeQuizSet {
  const startAnswer = firstEmbedded(row.maze_start_answers);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? '',
    description: row.description ?? '',
    coverImageUrl: row.cover_image_url ?? '',
    hasStartPage: row.has_start_page,
    startImageUrl: row.start_image_url ?? '',
    startAnswerText: startAnswer?.answer_text ?? '',
    hasEndPage: row.has_end_page,
    endImageUrl: row.end_image_url ?? '',
    difficultyLabel: row.difficulty_label ?? '',
    estimatedMinutes: row.estimated_minutes === null ? '' : String(row.estimated_minutes),
    status: row.status,
    sortOrder: row.sort_order,
  };
}

function toAdminMazeQuestion(row: AdminMazeQuestionRow): AdminMazeQuestion {
  const answer = firstEmbedded(row.maze_question_answers);

  return {
    id: row.id,
    setId: row.set_id,
    questionNo: row.question_no,
    imageUrl: row.image_url,
    answerText: answer?.answer_text ?? '',
  };
}

function setToRow(input: AdminMazeQuizSetInput) {
  return {
    slug: input.slug.trim(),
    title: input.title.trim(),
    summary: input.summary.trim() || null,
    description: input.description.trim() || null,
    cover_image_url: input.coverImageUrl.trim() || null,
    has_start_page: input.hasStartPage,
    start_image_url: input.hasStartPage ? input.startImageUrl.trim() || null : null,
    has_end_page: input.hasEndPage,
    end_image_url: input.hasEndPage ? input.endImageUrl.trim() || null : null,
    difficulty_label: input.difficultyLabel.trim() || null,
    estimated_minutes: input.estimatedMinutes.trim() ? Number(input.estimatedMinutes) : null,
    status: input.status,
    sort_order: input.sortOrder,
    updated_at: new Date().toISOString(),
  };
}

export async function getAdminMazeQuizSets() {
  const session = getRequiredSession();
  const rows = await restRequest<AdminMazeQuizSetRow[]>(
    '/maze_quiz_sets?select=id,slug,title,summary,description,cover_image_url,has_start_page,start_image_url,has_end_page,end_image_url,difficulty_label,estimated_minutes,status,sort_order,maze_start_answers(answer_text)&order=sort_order.asc',
    {
      token: session.access_token,
    },
  );

  return rows.map(toAdminMazeQuizSet);
}

export async function getAdminMazeQuestions(setId: string) {
  const session = getRequiredSession();
  const rows = await restRequest<AdminMazeQuestionRow[]>(
    `/maze_questions?set_id=eq.${setId}&select=id,set_id,question_no,image_url,maze_question_answers(answer_text)&order=question_no.asc`,
    {
      token: session.access_token,
    },
  );

  return rows.map(toAdminMazeQuestion);
}

export async function saveAdminMazeQuizSet(input: AdminMazeQuizSetInput) {
  const session = getRequiredSession();
  const path = input.id ? `/maze_quiz_sets?id=eq.${input.id}` : '/maze_quiz_sets';
  const method = input.id ? 'PATCH' : 'POST';
  const [row] = await restRequest<AdminMazeQuizSetRow[]>(path, {
    method,
    token: session.access_token,
    body: input.id
      ? setToRow(input)
      : {
          ...setToRow(input),
          created_at: new Date().toISOString(),
        },
  });

  if (!row) {
    throw new Error('미궁 퀴즈셋 저장 결과를 확인할 수 없습니다.');
  }

  if (input.hasStartPage) {
    await restRequest('/maze_start_answers?on_conflict=set_id', {
      method: 'POST',
      token: session.access_token,
      body: {
        set_id: row.id,
        answer_text: input.startAnswerText,
        updated_at: new Date().toISOString(),
      },
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
    });
  } else {
    await restRequest(`/maze_start_answers?set_id=eq.${row.id}`, {
      method: 'DELETE',
      token: session.access_token,
      headers: {
        Prefer: 'return=minimal',
      },
    });
  }

  const [freshRow] = await restRequest<AdminMazeQuizSetRow[]>(
    `/maze_quiz_sets?id=eq.${row.id}&select=id,slug,title,summary,description,cover_image_url,has_start_page,start_image_url,has_end_page,end_image_url,difficulty_label,estimated_minutes,status,sort_order,maze_start_answers(answer_text)`,
    {
      token: session.access_token,
    },
  );

  return freshRow ? toAdminMazeQuizSet(freshRow) : toAdminMazeQuizSet(row);
}

export async function deleteAdminMazeQuizSet(setId: string) {
  const session = getRequiredSession();

  await restRequest(`/maze_quiz_sets?id=eq.${setId}`, {
    method: 'DELETE',
    token: session.access_token,
    headers: {
      Prefer: 'return=minimal',
    },
  });
}

export async function saveAdminMazeQuestions(setId: string, questions: AdminMazeQuestionInput[]) {
  const session = getRequiredSession();
  const existingQuestions = await getAdminMazeQuestions(setId);

  await Promise.all(existingQuestions.map((question, index) => (
    restRequest(`/maze_questions?id=eq.${question.id}`, {
      method: 'PATCH',
      token: session.access_token,
      body: {
        question_no: 10000 + index,
        updated_at: new Date().toISOString(),
      },
      headers: {
        Prefer: 'return=minimal',
      },
    })
  )));

  const savedQuestions: AdminMazeQuestion[] = [];

  for (const question of questions) {
    const body = {
      set_id: setId,
      question_no: question.questionNo,
      image_url: question.imageUrl.trim(),
      updated_at: new Date().toISOString(),
    };
    const path = question.id ? `/maze_questions?id=eq.${question.id}` : '/maze_questions';
    const method = question.id ? 'PATCH' : 'POST';
    const [row] = await restRequest<AdminMazeQuestionRow[]>(path, {
      method,
      token: session.access_token,
      body: question.id
        ? body
        : {
            ...body,
            created_at: new Date().toISOString(),
          },
    });

    if (!row) {
      throw new Error('미궁 문제 저장 결과를 확인할 수 없습니다.');
    }

    await restRequest('/maze_question_answers?on_conflict=question_id', {
      method: 'POST',
      token: session.access_token,
      body: {
        question_id: row.id,
        answer_text: question.answerText,
        updated_at: new Date().toISOString(),
      },
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
    });

    savedQuestions.push(toAdminMazeQuestion({
      ...row,
      maze_question_answers: {
        answer_text: question.answerText,
      },
    }));
  }

  const savedIds = new Set(savedQuestions.map((question) => question.id));
  await Promise.all(existingQuestions.filter((question) => !savedIds.has(question.id)).map((question) => (
    restRequest(`/maze_questions?id=eq.${question.id}`, {
      method: 'DELETE',
      token: session.access_token,
      headers: {
        Prefer: 'return=minimal',
      },
    })
  )));

  return getAdminMazeQuestions(setId);
}

export async function uploadMazeAsset(setId: string, kind: 'cover' | 'start' | 'end' | 'question', file: File) {
  const session = getRequiredSession();
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const objectPath = `maze/${setId}/${kind}-${Date.now()}-${crypto.randomUUID()}.${extension}`;

  return uploadStorageObject(loungeAssetBucket, objectPath, file, session.access_token);
}
