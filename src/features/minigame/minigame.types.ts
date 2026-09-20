export type WebGLPlayer = {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
};

export type WebGLAuthPayload = WebGLPlayer & {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
};

export type SubmitMinigameScoreInput = {
  gameSlug: string;
  score: number;
  clientRunId: string;
  durationMs?: number | null;
  clientVersion?: string | null;
  metadata?: Record<string, unknown>;
};

export type MinigameScoreResult = {
  submissionId: string;
  gameId: string;
  gameSlug: string;
  score: number;
  personalBest: number;
  isPersonalBest: boolean;
  ranking: number | null;
  submittedAt: string;
  isDuplicate: boolean;
};

export type MyMinigameBest = {
  gameId: string;
  gameSlug: string;
  personalBest: number | null;
  ranking: number | null;
  playCount: number;
  bestAchievedAt: string | null;
};

export type MinigameRankingEntry = {
  ranking: number;
  userId: string;
  nickname: string;
  score: number;
  bestAchievedAt: string;
  isMe: boolean;
};
