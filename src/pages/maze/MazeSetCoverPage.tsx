import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { getMazeQuizSet, getMyMazeAttempt, startMazeAttempt } from '../../features/maze/maze.api';
import type { MazeAttempt, MazeQuizSet } from '../../features/maze/types/maze.types';
import { PageShell } from '../../shared/components/layout/PageShell';
import styles from './MazePage.module.css';

type PageStatus = 'loading' | 'ready' | 'error' | 'notFound';

export function MazeSetCoverPage() {
  const navigate = useNavigate();
  const { setSlug = '' } = useParams();
  const [set, setSet] = useState<MazeQuizSet | null>(null);
  const [attempt, setAttempt] = useState<MazeAttempt | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadSet() {
      try {
        setStatus('loading');
        setStartError('');
        const nextSet = await getMazeQuizSet(setSlug);

        if (!nextSet) {
          if (isMounted) {
            setStatus('notFound');
          }
          return;
        }

        const nextAttempt = await getMyMazeAttempt(nextSet.id);

        if (isMounted) {
          setSet(nextSet);
          setAttempt(nextAttempt);
          setStatus('ready');
        }
      } catch {
        if (isMounted) {
          setStatus('error');
        }
      }
    }

    void loadSet();

    return () => {
      isMounted = false;
    };
  }, [setSlug]);

  async function handleStart() {
    if (!set) {
      return;
    }

    try {
      setIsStarting(true);
      setStartError('');
      await startMazeAttempt(set.id);
      navigate(`/lounge/maze/${set.slug}/play`);
    } catch (error) {
      const detail = error instanceof Error && error.message ? ` (${error.message})` : '';
      setStartError(`플레이를 시작하지 못했습니다.${detail}`);
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <PageShell>
      <div className={styles.page}>
        <div className={styles.container}>
          {status === 'loading' ? (
            <section className={styles.statePanel} aria-live="polite">미궁 정보를 불러오는 중입니다.</section>
          ) : null}

          {status === 'error' ? (
            <section className={styles.statePanel} role="alert">
              미궁 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </section>
          ) : null}

          {status === 'notFound' ? (
            <section className={styles.statePanel}>존재하지 않거나 공개되지 않은 미궁입니다.</section>
          ) : null}

          {status === 'ready' && set ? (
            <section className={styles.coverLayout} aria-labelledby="maze-set-title">
              <div className={styles.coverMedia}>
                {set.coverImageUrl ? <img src={set.coverImageUrl} alt="" aria-hidden="true" /> : set.title.slice(0, 1)}
              </div>
              <div className={styles.coverPanel}>
                <p className={styles.coverMeta}>미궁 퀴즈셋</p>
                <h1 id="maze-set-title" className={styles.coverTitle}>{set.title}</h1>
                <p className={styles.coverDescription}>
                  {set.description ?? set.summary ?? '문제를 순서대로 풀어 마지막 문제까지 도달해 보세요.'}
                </p>
                <div className={styles.coverStats}>
                  <span className={styles.statBadge}>{set.questionCount}문제</span>
                  {set.difficultyLabel ? <span className={styles.statBadge}>{set.difficultyLabel}</span> : null}
                  {set.estimatedMinutes ? <span className={styles.statBadge}>예상 {set.estimatedMinutes}분</span> : null}
                  {attempt ? (
                    <span className={styles.statBadge}>
                      {attempt.status === 'cleared' ? '클리어 완료' : `${attempt.currentQuestionNo}번 진행 중`}
                    </span>
                  ) : null}
                </div>
                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={isStarting || set.questionCount === 0}
                    onClick={() => void handleStart()}
                  >
                    {isStarting ? '시작 중' : attempt ? '이어 플레이' : '플레이 시작'}
                  </button>
                  <Link to="/lounge/maze" className={styles.secondaryButton}>목록으로</Link>
                </div>
                {startError ? (
                  <p className={`${styles.feedback} ${styles.feedbackError}`} role="alert">
                    {startError}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
