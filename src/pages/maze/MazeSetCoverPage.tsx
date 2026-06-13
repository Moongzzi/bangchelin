import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { getMazeQuizSet, getMazeRanking, getMyMazeAttempt, restartMazeAttempt, startMazeAttempt } from '../../features/maze/maze.api';
import { getMazeRankingDisplayEntries } from '../../features/maze/mazeRankingDisplay';
import type { MazeAttempt, MazeQuizSet, MazeRankingEntry, MazeRankingMetric } from '../../features/maze/types/maze.types';
import { PageShell } from '../../shared/components/layout/PageShell';
import styles from './MazePage.module.css';

type PageStatus = 'loading' | 'ready' | 'error' | 'notFound';
type RankingStatus = 'idle' | 'loading' | 'ready' | 'error';

function formatElapsedSeconds(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
}

export function MazeSetCoverPage() {
  const navigate = useNavigate();
  const { setSlug = '' } = useParams();
  const [set, setSet] = useState<MazeQuizSet | null>(null);
  const [attempt, setAttempt] = useState<MazeAttempt | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [rankingMetric, setRankingMetric] = useState<MazeRankingMetric>('clear_order');
  const [ranking, setRanking] = useState<MazeRankingEntry[]>([]);
  const [rankingStatus, setRankingStatus] = useState<RankingStatus>('idle');
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const rankingDisplayEntries = getMazeRankingDisplayEntries(ranking, rankingMetric);

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

  useEffect(() => {
    let isMounted = true;

    async function loadRanking() {
      if (!set) {
        setRanking([]);
        setRankingStatus('idle');
        return;
      }

      try {
        setRankingStatus('loading');
        const nextRanking = await getMazeRanking(set.id, rankingMetric);

        if (isMounted) {
          setRanking(nextRanking);
          setRankingStatus('ready');
        }
      } catch {
        if (isMounted) {
          setRankingStatus('error');
        }
      }
    }

    void loadRanking();

    return () => {
      isMounted = false;
    };
  }, [rankingMetric, set]);

  async function handleStart() {
    if (!set) {
      return;
    }

    try {
      setIsStarting(true);
      setStartError('');
      await (attempt?.status === 'cleared' ? restartMazeAttempt(set.id) : startMazeAttempt(set.id));
      navigate(`/lounge/maze/${set.slug}/play`);
    } catch {
      setStartError('플레이를 시작하지 못했습니다. 잠시 후 다시 시도해주세요.');
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
              미궁 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
            </section>
          ) : null}

          {status === 'notFound' ? (
            <section className={styles.statePanel}>존재하지 않거나 공개되지 않은 미궁입니다.</section>
          ) : null}

          {status === 'ready' && set ? (
            <>
              <section className={styles.coverLayout} aria-labelledby="maze-set-title">
                <div className={styles.coverMedia}>
                  {set.coverImageUrl ? <img src={set.coverImageUrl} alt="" aria-hidden="true" /> : set.title.slice(0, 1)}
                </div>
                <div className={styles.coverPanel}>
                  <p className={styles.coverMeta}>미궁 퀴즈셋</p>
                  <h1 id="maze-set-title" className={styles.coverTitle}>{set.title}</h1>
                  <p className={styles.coverDescription}>
                    {set.description ?? set.summary ?? '문제를 순서대로 풀고 마지막 문제까지 도달해보세요.'}
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
                      {isStarting ? '시작 중' : attempt?.status === 'cleared' ? '다시하기' : attempt ? '이어 플레이' : '플레이 시작'}
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

              <section className={styles.rankingPanel} aria-labelledby="maze-ranking-title">
                <div className={styles.rankingHeader}>
                  <div>
                    <p className={styles.coverMeta}>RANKING</p>
                    <h2 id="maze-ranking-title" className={styles.rankingTitle}>랭킹</h2>
                  </div>
                  <div className={styles.rankingTabs} aria-label="랭킹 기준">
                    <button
                      type="button"
                      className={`${styles.rankingTab} ${rankingMetric === 'clear_order' ? styles.rankingTabActive : ''}`}
                      aria-pressed={rankingMetric === 'clear_order'}
                      onClick={() => setRankingMetric('clear_order')}
                    >
                      선착 클리어순
                    </button>
                    <button
                      type="button"
                      className={`${styles.rankingTab} ${rankingMetric === 'elapsed_time' ? styles.rankingTabActive : ''}`}
                      aria-pressed={rankingMetric === 'elapsed_time'}
                      onClick={() => setRankingMetric('elapsed_time')}
                    >
                      플레이 타임순
                    </button>
                  </div>
                </div>

                {rankingStatus === 'loading' ? <p className={styles.feedback}>랭킹을 불러오는 중입니다.</p> : null}
                {rankingStatus === 'error' ? (
                  <p className={`${styles.feedback} ${styles.feedbackError}`} role="alert">
                    랭킹을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
                  </p>
                ) : null}
                {rankingStatus === 'ready' && ranking.length === 0 ? (
                  <p className={styles.feedback}>아직 클리어 기록이 없습니다.</p>
                ) : null}
                {rankingDisplayEntries.length > 0 ? (
                  <ol className={styles.rankingList}>
                    {rankingDisplayEntries.map(({ entry, placement }) => {
                      const displayRank = rankingMetric === 'clear_order' ? entry.clearRank : entry.elapsedRank;
                      const isPinnedMine = placement === 'my_record';

                      return (
                        <li
                          key={`${placement}-${entry.userId}-${entry.clearRank}`}
                          className={entry.isMe ? styles.rankingItemMine : styles.rankingItem}
                        >
                          <span className={`${styles.rankNo} ${isPinnedMine ? styles.rankNoMine : ''}`}>
                            {isPinnedMine ? '내 기록' : displayRank}
                          </span>
                          <strong>{entry.nickname}</strong>
                          <span>{formatElapsedSeconds(entry.totalElapsedSeconds)}</span>
                          <time dateTime={entry.clearedAt}>{new Date(entry.clearedAt).toLocaleString('ko-KR')}</time>
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
