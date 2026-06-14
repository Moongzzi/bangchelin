import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getMyProfile } from '../../features/auth/auth.api';
import { getLoungeEventContent } from '../../features/lounge/lounge.api';
import type { LoungeContent } from '../../features/lounge/types/lounge.types';
import { getMazeRanking, getMyMazeAttempt } from '../../features/maze/maze.api';
import { getMazeRankingDisplayEntries } from '../../features/maze/mazeRankingDisplay';
import type { MazeRankingEntry } from '../../features/maze/types/maze.types';
import { PageShell } from '../../shared/components/layout/PageShell';
import styles from '../maze/MazePage.module.css';

type PageStatus = 'loading' | 'ready' | 'error' | 'notFound' | 'locked';

function formatElapsedSeconds(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
}

function getRankingDisplayRank(entry: MazeRankingEntry, metric: 'clear_order' | 'elapsed_time') {
  return metric === 'elapsed_time' ? entry.elapsedRank : entry.clearRank;
}

function renderEventDescription(content: LoungeContent) {
  if (content.descriptionBlocks.length === 0) {
    return <p className={styles.description}>{content.summary ?? '라운지 이벤트입니다.'}</p>;
  }

  return (
    <div className={styles.eventBody}>
      {content.descriptionBlocks.map((block) => {
        if (block.type === 'text') {
          return <p key={block.id} className={styles.description}>{block.text}</p>;
        }

        return (
          <figure key={block.id} className={styles.eventBodyFigure}>
            <img src={block.imageUrl} alt={block.alt} />
            {block.caption ? <figcaption>{block.caption}</figcaption> : null}
          </figure>
        );
      })}
    </div>
  );
}

export function LoungeEventPage() {
  const { eventSlug = '' } = useParams();
  const [content, setContent] = useState<LoungeContent | null>(null);
  const [ranking, setRanking] = useState<MazeRankingEntry[]>([]);
  const [isRankingLocked, setIsRankingLocked] = useState(false);
  const [status, setStatus] = useState<PageStatus>('loading');

  useEffect(() => {
    let isMounted = true;

    async function loadEvent() {
      try {
        setStatus('loading');
        setIsRankingLocked(false);
        const nextContent = await getLoungeEventContent(eventSlug);

        if (!nextContent?.eventConfig) {
          if (isMounted) {
            setStatus('notFound');
          }
          return;
        }

        const opensAt = nextContent.eventConfig.opensAt ? new Date(nextContent.eventConfig.opensAt).getTime() : null;
        if (opensAt && opensAt > Date.now()) {
          if (isMounted) {
            setContent(nextContent);
            setStatus('locked');
          }
          return;
        }

        let nextRanking: MazeRankingEntry[] = [];
        let nextIsRankingLocked = false;

        if (nextContent.eventConfig.rankingSource === 'maze' && nextContent.eventConfig.rankingTargetId) {
          const [nextAttempt, nextProfile] = await Promise.all([
            getMyMazeAttempt(nextContent.eventConfig.rankingTargetId),
            getMyProfile(),
          ]);
          nextIsRankingLocked = nextAttempt?.status !== 'cleared' && nextProfile?.role !== 'admin';

          if (!nextIsRankingLocked) {
            nextRanking = await getMazeRanking(
              nextContent.eventConfig.rankingTargetId,
              nextContent.eventConfig.rankingMetric,
              nextContent.eventConfig.rewardRankLimit,
            );
          }
        }

        if (isMounted) {
          setContent(nextContent);
          setRanking(nextRanking);
          setIsRankingLocked(nextIsRankingLocked);
          setStatus('ready');
        }
      } catch {
        if (isMounted) {
          setStatus('error');
        }
      }
    }

    void loadEvent();

    return () => {
      isMounted = false;
    };
  }, [eventSlug]);

  const eventConfig = content?.eventConfig ?? null;
  const metricLabel = eventConfig?.rankingMetric === 'elapsed_time' ? '플레이 타임 짧은 순' : '선착 클리어순';
  const conditionLabel = eventConfig?.rankConditionType === 'exact'
    ? `${eventConfig.rewardRankLimit}등만`
    : `${eventConfig?.rewardRankLimit ?? 0}등까지`;
  const conditionRanking = eventConfig?.rankConditionType === 'exact'
    ? ranking.filter((entry) => getRankingDisplayRank(entry, eventConfig.rankingMetric) === eventConfig.rewardRankLimit)
    : ranking;

  const rankingDisplayEntries = eventConfig ? getMazeRankingDisplayEntries(conditionRanking, eventConfig.rankingMetric, ranking) : [];

  return (
    <PageShell>
      <div className={styles.page}>
        <div className={styles.container}>
          {status === 'loading' ? (
            <section className={styles.statePanel} aria-live="polite">이벤트를 불러오는 중입니다.</section>
          ) : null}

          {status === 'error' ? (
            <section className={styles.statePanel} role="alert">
              이벤트를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
            </section>
          ) : null}

          {status === 'notFound' ? (
            <section className={styles.statePanel}>존재하지 않거나 공개되지 않은 이벤트입니다.</section>
          ) : null}

          {status === 'locked' && content && eventConfig ? (
            <section className={styles.statePanel}>
              {content.title}는 {eventConfig.opensAt ? new Date(eventConfig.opensAt).toLocaleString('ko-KR') : '지정된 시간'}에 오픈됩니다.
            </section>
          ) : null}

          {status === 'ready' && content && eventConfig ? (
            <>
              <section className={styles.hero} aria-labelledby="event-title">
                <p className={styles.eyebrow}>BANGCHELIN EVENT</p>
                <h1 id="event-title" className={styles.title}>{content.title}</h1>
                {renderEventDescription(content)}
                <div className={styles.coverStats}>
                  <span className={styles.statBadge}>{metricLabel}</span>
                  <span className={styles.statBadge}>{conditionLabel}</span>
                  {eventConfig.opensAt ? (
                    <span className={styles.statBadge}>오픈 {new Date(eventConfig.opensAt).toLocaleString('ko-KR')}</span>
                  ) : null}
                </div>
                {eventConfig.targetRoutePath ? (
                  <div className={styles.actionRow}>
                    <Link to={eventConfig.targetRoutePath} className={styles.primaryButton}>이벤트 콘텐츠로 이동</Link>
                  </div>
                ) : null}
              </section>

              <section className={styles.rankingPanel} aria-labelledby="event-ranking-title">
                <div className={styles.rankingHeader}>
                  <div>
                    <p className={styles.coverMeta}>EVENT RANKING</p>
                    <h2 id="event-ranking-title" className={styles.rankingTitle}>조건 대상 랭킹</h2>
                  </div>
                </div>
                {isRankingLocked ? (
                  <p className={styles.feedback}>해당 미궁을 클리어한 뒤 랭킹을 확인할 수 있습니다.</p>
                ) : rankingDisplayEntries.length === 0 ? (
                  <p className={styles.feedback}>아직 조건에 해당하는 기록이 없습니다.</p>
                ) : (
                  <ol className={styles.rankingList}>
                    {rankingDisplayEntries.map(({ entry, placement }) => {
                      const displayRank = eventConfig.rankingMetric === 'elapsed_time' ? entry.elapsedRank : entry.clearRank;
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
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
