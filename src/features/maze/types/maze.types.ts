export type MazeQuizSetStatus = 'draft' | 'published' | 'archived';
export type MazeAttemptStatus = 'in_progress' | 'cleared';

export type MazeQuizSet = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  coverImageUrl: string | null;
  hasStartPage: boolean;
  startImageUrl: string | null;
  hasEndPage: boolean;
  endImageUrl: string | null;
  difficultyLabel: string | null;
  estimatedMinutes: number | null;
  questionCount: number;
  sortOrder: number;
};

export type MazeQuestion = {
  id: string;
  setId: string;
  questionNo: number;
  imageUrl: string;
};

export type MazeAttempt = {
  id: string;
  setId: string;
  userId: string;
  status: MazeAttemptStatus;
  currentQuestionNo: number;
  startedAt: string;
  clearedAt: string | null;
  totalElapsedSeconds: number | null;
  clearRank: number | null;
};

export type MazeRankingMetric = 'clear_order' | 'elapsed_time';

export type MazeRankingEntry = {
  userId: string;
  nickname: string;
  clearedAt: string;
  totalElapsedSeconds: number;
  clearRank: number;
  elapsedRank: number;
  isMe: boolean;
};

export type MazeAnswerResult = {
  isCorrect: boolean;
  currentQuestionNo: number;
  status: MazeAttemptStatus;
  clearedAt: string | null;
  totalElapsedSeconds: number | null;
  clearRank: number | null;
};
