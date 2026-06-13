import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  getMazeQuestions,
  getMazeQuizSet,
  startMazeAttempt,
  submitMazeAnswer,
  submitMazeStartAnswer,
} from '../../features/maze/maze.api';
import type { MazeAttempt, MazeQuestion, MazeQuizSet } from '../../features/maze/types/maze.types';
import { PageShell } from '../../shared/components/layout/PageShell';
import { InputField } from '../../shared/components/input-field';
import styles from './MazePage.module.css';

type PageStatus = 'loading' | 'ready' | 'error' | 'notFound';
type FeedbackType = 'neutral' | 'error' | 'success';

function formatElapsedSeconds(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
}

function getElapsedSeconds(attempt: MazeAttempt | null, now: number) {
  if (!attempt) {
    return 0;
  }

  if (attempt.status === 'cleared' && attempt.totalElapsedSeconds !== null) {
    return attempt.totalElapsedSeconds;
  }

  return Math.floor((now - new Date(attempt.startedAt).getTime()) / 1000);
}

function getSelectedQuestionNo(nextSet: MazeQuizSet, nextQuestions: MazeQuestion[], nextAttempt: MazeAttempt) {
  if (nextSet.hasStartPage && nextAttempt.currentQuestionNo === 0) {
    return 0;
  }

  if (nextQuestions.length === 0) {
    return nextAttempt.currentQuestionNo;
  }

  const firstQuestionNo = nextQuestions[0]?.questionNo ?? 1;
  const lastQuestionNo = nextQuestions[nextQuestions.length - 1]?.questionNo ?? firstQuestionNo;
  return Math.min(Math.max(nextAttempt.currentQuestionNo, firstQuestionNo), lastQuestionNo);
}

export function MazePlayPage() {
  const navigate = useNavigate();
  const { setSlug = '' } = useParams();
  const [set, setSet] = useState<MazeQuizSet | null>(null);
  const [questions, setQuestions] = useState<MazeQuestion[]>([]);
  const [attempt, setAttempt] = useState<MazeAttempt | null>(null);
  const [selectedQuestionNo, setSelectedQuestionNo] = useState(1);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<PageStatus>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: 'neutral' as FeedbackType, message: '' });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPlayState() {
      try {
        setStatus('loading');
        const nextSet = await getMazeQuizSet(setSlug);

        if (!nextSet) {
          if (isMounted) {
            setStatus('notFound');
          }
          return;
        }

        const [nextQuestions, nextAttempt] = await Promise.all([
          getMazeQuestions(nextSet.id),
          startMazeAttempt(nextSet.id),
        ]);

        if (isMounted) {
          setSet(nextSet);
          setQuestions(nextQuestions);
          setAttempt(nextAttempt);
          setSelectedQuestionNo(getSelectedQuestionNo(nextSet, nextQuestions, nextAttempt));
          setStatus('ready');
        }
      } catch {
        if (isMounted) {
          setStatus('error');
        }
      }
    }

    void loadPlayState();

    return () => {
      isMounted = false;
    };
  }, [setSlug]);

  const selectedQuestion = useMemo(
    () => questions.find((question) => question.questionNo === selectedQuestionNo) ?? null,
    [questions, selectedQuestionNo],
  );
  const elapsedSeconds = getElapsedSeconds(attempt, now);
  const isCleared = attempt?.status === 'cleared';
  const isStartPage = Boolean(set?.hasStartPage && attempt?.currentQuestionNo === 0 && selectedQuestionNo === 0);
  const currentImageUrl = isStartPage ? set?.startImageUrl : selectedQuestion?.imageUrl;
  const canSubmit = Boolean(
    (selectedQuestion || isStartPage)
    && attempt
    && !isCleared
    && selectedQuestionNo === attempt.currentQuestionNo
    && answer.length > 0,
  );

  function handleQuestionSelect(questionNo: number) {
    if (!attempt || questionNo > attempt.currentQuestionNo) {
      return;
    }

    setSelectedQuestionNo(questionNo);
    setAnswer('');
    setFeedback({ type: 'neutral', message: '' });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if ((!selectedQuestion && !isStartPage) || !set || !canSubmit) {
      return;
    }

    try {
      setIsSubmitting(true);
      const result = isStartPage
        ? await submitMazeStartAnswer(set.id, answer)
        : await submitMazeAnswer(selectedQuestion?.id ?? '', answer);

      setAttempt((currentAttempt) => currentAttempt
        ? {
            ...currentAttempt,
            status: result.status,
            currentQuestionNo: result.currentQuestionNo,
            clearedAt: result.clearedAt,
            totalElapsedSeconds: result.totalElapsedSeconds,
            clearRank: result.clearRank,
          }
        : currentAttempt);

      if (result.isCorrect) {
        setAnswer('');
        setFeedback({
          type: 'success',
          message: result.status === 'cleared' ? '미궁을 클리어했습니다.' : '정답입니다. 다음 문제가 열렸습니다.',
        });
        setSelectedQuestionNo(result.currentQuestionNo);
      } else {
        setFeedback({ type: 'error', message: '정답이 아닙니다.' });
      }
    } catch {
      setFeedback({ type: 'error', message: '정답을 제출하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell>
      <div className={styles.page}>
        <div className={styles.container}>
          {status === 'loading' ? (
            <section className={styles.statePanel} aria-live="polite">미궁을 불러오는 중입니다.</section>
          ) : null}

          {status === 'error' ? (
            <section className={styles.statePanel} role="alert">
              미궁을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </section>
          ) : null}

          {status === 'notFound' ? (
            <section className={styles.statePanel}>존재하지 않거나 공개되지 않은 미궁입니다.</section>
          ) : null}

          {status === 'ready' && set && isCleared ? (
            <section className={styles.playShell} aria-labelledby="maze-clear-title">
              <div className={styles.playTop}>
                <div>
                  <p className={styles.playMeta}>미궁 클리어</p>
                  <h1 id="maze-clear-title" className={styles.title}>{set.title}</h1>
                </div>
                <div className={styles.timer} aria-label="경과 시간">{formatElapsedSeconds(elapsedSeconds)}</div>
              </div>
              <div className={styles.clearPanel}>
                <h2 className={styles.clearTitle}>
                  {attempt?.clearRank ? `${attempt.clearRank}번째 클리어를 축하합니다.` : '클리어를 축하합니다.'}
                </h2>
                {set.hasEndPage && set.endImageUrl ? (
                  <div className={styles.questionFrame}>
                    <img src={set.endImageUrl} alt="미궁 종료 페이지" className={styles.questionImage} />
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {status === 'ready' && set && !isCleared && (selectedQuestion || isStartPage) ? (
            <section className={styles.playShell} aria-labelledby="maze-play-title">
              <div className={styles.playTop}>
                <div>
                  <p className={styles.playMeta}>미궁 플레이</p>
                  <h1 id="maze-play-title" className={styles.title}>{set.title}</h1>
                </div>
                <div className={styles.timer} aria-label="경과 시간">{formatElapsedSeconds(elapsedSeconds)}</div>
              </div>

              <div className={styles.questionTabs} aria-label="문제 이동">
                <button
                  type="button"
                  className={`${styles.questionTab} ${styles.exitTab}`}
                  aria-label="미궁 표지로 돌아가기"
                  onClick={() => navigate(`/lounge/maze/${set.slug}`)}
                >
                  &lt;
                </button>
                {questions.map((question) => {
                  const isLocked = !attempt || question.questionNo > attempt.currentQuestionNo;

                  return (
                    <button
                      key={question.id}
                      type="button"
                      className={`${styles.questionTab} ${
                        question.questionNo === selectedQuestionNo ? styles.questionTabActive : ''
                      } ${isLocked ? styles.questionTabLocked : ''}`}
                      disabled={isLocked}
                      onClick={() => handleQuestionSelect(question.questionNo)}
                    >
                      {question.questionNo}
                    </button>
                  );
                })}
              </div>

              <div className={styles.playPanel}>
                <div className={styles.questionFrame}>
                  {currentImageUrl ? (
                    <img
                      src={currentImageUrl}
                      alt={isStartPage ? '미궁 시작 페이지' : `${selectedQuestion?.questionNo}번 문제`}
                      className={styles.questionImage}
                    />
                  ) : null}
                </div>
                <aside className={styles.answerPanel}>
                  <p className={styles.playMeta}>{isStartPage ? '시작 페이지' : `${selectedQuestion?.questionNo}번 문제`}</p>
                  <form className={styles.answerForm} onSubmit={(event) => void handleSubmit(event)}>
                    <InputField
                      label="정답"
                      placeholder="정답 입력"
                      variant="outlined"
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      disabled={selectedQuestionNo !== attempt?.currentQuestionNo}
                      autoComplete="off"
                      fullWidth
                    />
                    <button type="submit" className={styles.answerButton} disabled={!canSubmit || isSubmitting}>
                      {isSubmitting ? '확인 중' : '정답 제출'}
                    </button>
                  </form>
                  {feedback.message ? (
                    <p
                      className={`${styles.feedback} ${
                        feedback.type === 'error' ? styles.feedbackError : ''
                      } ${feedback.type === 'success' ? styles.feedbackSuccess : ''}`}
                      role={feedback.type === 'error' ? 'alert' : 'status'}
                    >
                      {feedback.message}
                    </p>
                  ) : null}
                </aside>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
