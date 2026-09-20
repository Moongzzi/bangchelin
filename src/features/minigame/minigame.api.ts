import { getSession, restRequest } from '../../shared/api/supabaseRest';
import type {
  MinigameRankingEntry,
  MinigameScoreResult,
  MyMinigameBest,
  SubmitMinigameScoreInput,
  WebGLAuthPayload,
  WebGLPlayer,
} from './minigame.types';

type WebGLPlayerRow = {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
};

type MinigameScoreResultRow = {
  submission_id: string;
  game_id: string;
  game_slug: string;
  score: number;
  personal_best: number;
  is_personal_best: boolean;
  ranking: number | null;
  submitted_at: string;
  is_duplicate: boolean;
};

type MyMinigameBestRow = {
  game_id: string;
  game_slug: string;
  personal_best: number | null;
  ranking: number | null;
  play_count: number;
  best_achieved_at: string | null;
};

type MinigameRankingEntryRow = {
  ranking: number;
  user_id: string;
  nickname: string;
  score: number;
  best_achieved_at: string;
  is_me: boolean;
};

function getRequiredAccessToken() {
  const session = getSession();

  if (!session) {
    throw new Error('로그인이 필요합니다.');
  }

  return session.access_token;
}

function toPlayer(row: WebGLPlayerRow): WebGLPlayer {
  return {
    userId: row.user_id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
  };
}

export async function getWebGLAuthPayload(): Promise<WebGLAuthPayload> {
  const [row] = await restRequest<WebGLPlayerRow[]>('/rpc/get_webgl_player', {
    method: 'POST',
    token: getRequiredAccessToken(),
    body: {},
  });
  const refreshedSession = getSession();

  if (!row || !refreshedSession) {
    throw new Error('WebGL 로그인 정보를 확인할 수 없습니다.');
  }

  return {
    ...toPlayer(row),
    accessToken: refreshedSession.access_token,
    tokenType: refreshedSession.token_type,
    expiresAt: refreshedSession.expires_at ?? Math.floor(Date.now() / 1000) + refreshedSession.expires_in,
  };
}

export async function submitMinigameScore(input: SubmitMinigameScoreInput): Promise<MinigameScoreResult> {
  const [row] = await restRequest<MinigameScoreResultRow[]>('/rpc/submit_minigame_score', {
    method: 'POST',
    token: getRequiredAccessToken(),
    body: {
      p_game_slug: input.gameSlug,
      p_score: input.score,
      p_client_run_id: input.clientRunId,
      p_duration_ms: input.durationMs ?? null,
      p_client_version: input.clientVersion ?? null,
      p_metadata: input.metadata ?? {},
    },
  });

  if (!row) {
    throw new Error('게임 기록 저장 결과를 확인할 수 없습니다.');
  }

  return {
    submissionId: row.submission_id,
    gameId: row.game_id,
    gameSlug: row.game_slug,
    score: row.score,
    personalBest: row.personal_best,
    isPersonalBest: row.is_personal_best,
    ranking: row.ranking,
    submittedAt: row.submitted_at,
    isDuplicate: row.is_duplicate,
  };
}

export async function getMyMinigameBest(gameSlug: string): Promise<MyMinigameBest | null> {
  const [row] = await restRequest<MyMinigameBestRow[]>('/rpc/get_my_minigame_best', {
    method: 'POST',
    token: getRequiredAccessToken(),
    body: { p_game_slug: gameSlug },
  });

  return row ? {
    gameId: row.game_id,
    gameSlug: row.game_slug,
    personalBest: row.personal_best,
    ranking: row.ranking,
    playCount: row.play_count,
    bestAchievedAt: row.best_achieved_at,
  } : null;
}

export async function getMinigameRanking(gameSlug: string, limit = 50, offset = 0): Promise<MinigameRankingEntry[]> {
  const rows = await restRequest<MinigameRankingEntryRow[]>('/rpc/get_minigame_ranking', {
    method: 'POST',
    token: getRequiredAccessToken(),
    body: {
      p_game_slug: gameSlug,
      p_limit: limit,
      p_offset: offset,
    },
  });

  return rows.map((row) => ({
    ranking: row.ranking,
    userId: row.user_id,
    nickname: row.nickname,
    score: row.score,
    bestAchievedAt: row.best_achieved_at,
    isMe: row.is_me,
  }));
}
