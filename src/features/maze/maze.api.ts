import { getSession, restRequest } from '../../shared/api/supabaseRest';
import type {
  MazeAnswerResult,
  MazeAttempt,
  MazeAttemptStatus,
  MazeQuestion,
  MazeQuizSet,
  MazeRankingEntry,
  MazeRankingMetric,
} from './types/maze.types';

type MazeQuizSetRow = {
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
  sort_order: number;
  maze_questions?: Array<{ id: string }> | null;
};

type MazeQuestionRow = {
  id: string;
  set_id: string;
  question_no: number;
  image_url: string;
};

type MazeAttemptRow = {
  id: string;
  set_id: string;
  user_id: string;
  status: MazeAttemptStatus;
  current_question_no: number;
  started_at: string;
  cleared_at: string | null;
  total_elapsed_seconds: number | null;
  clear_rank: number | null;
};

type MazeAnswerResultRow = {
  is_correct: boolean;
  current_question_no: number;
  status: MazeAttemptStatus;
  cleared_at: string | null;
  total_elapsed_seconds: number | null;
  clear_rank: number | null;
};

type MazeRankingEntryRow = {
  user_id: string;
  nickname: string | null;
  cleared_at: string;
  total_elapsed_seconds: number;
  clear_rank: number;
  elapsed_rank: number;
  is_me: boolean;
};

function getRequiredSession() {
  const session = getSession();

  if (!session) {
    throw new Error('로그인이 필요한 기능입니다.');
  }

  return session;
}

function toMazeQuizSet(row: MazeQuizSetRow): MazeQuizSet {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    hasStartPage: row.has_start_page,
    startImageUrl: row.start_image_url,
    hasEndPage: row.has_end_page,
    endImageUrl: row.end_image_url,
    difficultyLabel: row.difficulty_label,
    estimatedMinutes: row.estimated_minutes,
    questionCount: row.maze_questions?.length ?? 0,
    sortOrder: row.sort_order,
  };
}

function toMazeQuestion(row: MazeQuestionRow): MazeQuestion {
  return {
    id: row.id,
    setId: row.set_id,
    questionNo: row.question_no,
    imageUrl: row.image_url,
  };
}

function toMazeAttempt(row: MazeAttemptRow): MazeAttempt {
  return {
    id: row.id,
    setId: row.set_id,
    userId: row.user_id,
    status: row.status,
    currentQuestionNo: row.current_question_no,
    startedAt: row.started_at,
    clearedAt: row.cleared_at,
    totalElapsedSeconds: row.total_elapsed_seconds,
    clearRank: row.clear_rank,
  };
}

function toMazeAnswerResult(row: MazeAnswerResultRow): MazeAnswerResult {
  return {
    isCorrect: row.is_correct,
    currentQuestionNo: row.current_question_no,
    status: row.status,
    clearedAt: row.cleared_at,
    totalElapsedSeconds: row.total_elapsed_seconds,
    clearRank: row.clear_rank,
  };
}

function toMazeRankingEntry(row: MazeRankingEntryRow): MazeRankingEntry {
  return {
    userId: row.user_id,
    nickname: row.nickname?.trim() || '알 수 없음',
    clearedAt: row.cleared_at,
    totalElapsedSeconds: row.total_elapsed_seconds,
    clearRank: row.clear_rank,
    elapsedRank: row.elapsed_rank,
    isMe: row.is_me,
  };
}

export async function getMazeQuizSets() {
  const session = getRequiredSession();
  const rows = await restRequest<MazeQuizSetRow[]>(
    '/maze_quiz_sets?status=eq.published&select=id,slug,title,summary,description,cover_image_url,has_start_page,start_image_url,has_end_page,end_image_url,difficulty_label,estimated_minutes,sort_order,maze_questions(id)&order=sort_order.asc',
    {
      token: session.access_token,
    },
  );

  return rows.map(toMazeQuizSet);
}

export async function getMazeQuizSet(slug: string) {
  const session = getRequiredSession();
  const [row] = await restRequest<MazeQuizSetRow[]>(
    `/maze_quiz_sets?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=id,slug,title,summary,description,cover_image_url,has_start_page,start_image_url,has_end_page,end_image_url,difficulty_label,estimated_minutes,sort_order,maze_questions(id)`,
    {
      token: session.access_token,
    },
  );

  return row ? toMazeQuizSet(row) : null;
}

export async function getMazeQuestions(setId: string) {
  const session = getRequiredSession();
  const rows = await restRequest<MazeQuestionRow[]>(
    `/maze_questions?set_id=eq.${setId}&select=id,set_id,question_no,image_url&order=question_no.asc`,
    {
      token: session.access_token,
    },
  );

  return rows.map(toMazeQuestion);
}

export async function getMyMazeAttempt(setId: string) {
  const session = getRequiredSession();
  const [row] = await restRequest<MazeAttemptRow[]>(
    `/maze_attempts?set_id=eq.${setId}&user_id=eq.${session.user.id}&select=id,set_id,user_id,status,current_question_no,started_at,cleared_at,total_elapsed_seconds,clear_rank`,
    {
      token: session.access_token,
    },
  );

  return row ? toMazeAttempt(row) : null;
}

export async function getMazeRanking(setId: string, metric: MazeRankingMetric, limit = 50) {
  const session = getRequiredSession();
  const rows = await restRequest<MazeRankingEntryRow[]>('/rpc/get_maze_ranking', {
    method: 'POST',
    token: session.access_token,
    body: {
      p_set_id: setId,
      p_metric: metric,
      p_limit: limit,
    },
  });

  return rows.map(toMazeRankingEntry);
}

export async function startMazeAttempt(setId: string) {
  const session = getRequiredSession();
  const [row] = await restRequest<MazeAttemptRow[]>('/rpc/start_maze_attempt', {
    method: 'POST',
    token: session.access_token,
    body: {
      p_set_id: setId,
    },
  });

  if (!row) {
    throw new Error('미궁 진행 정보를 만들 수 없습니다.');
  }

  return toMazeAttempt(row);
}

export async function submitMazeAnswer(questionId: string, answer: string) {
  const session = getRequiredSession();
  const [row] = await restRequest<MazeAnswerResultRow[]>('/rpc/submit_maze_answer', {
    method: 'POST',
    token: session.access_token,
    body: {
      p_question_id: questionId,
      p_answer: answer,
    },
  });

  if (!row) {
    throw new Error('정답 제출 결과를 확인할 수 없습니다.');
  }

  return toMazeAnswerResult(row);
}

export async function submitMazeStartAnswer(setId: string, answer: string) {
  const session = getRequiredSession();
  const [row] = await restRequest<MazeAnswerResultRow[]>('/rpc/submit_maze_start_answer', {
    method: 'POST',
    token: session.access_token,
    body: {
      p_set_id: setId,
      p_answer: answer,
    },
  });

  if (!row) {
    throw new Error('시작 페이지 정답 제출 결과를 확인할 수 없습니다.');
  }

  return toMazeAnswerResult(row);
}
