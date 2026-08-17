import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getMyMazeSets, type MyMazeSet } from '../../features/maze/maze.user.api';
import { PageShell } from '../../shared/components/layout/PageShell';
import { ROUTES } from '../../shared/constants/routes';
import styles from './MazePage.module.css';

type PageStatus = 'loading' | 'ready' | 'error';

function getStatusLabel(status: MyMazeSet['status']) {
  if (status === 'published') {
    return '공개';
  }

  if (status === 'archived') {
    return '보관';
  }

  return '초안';
}

export function MyMazePage() {
  const [sets, setSets] = useState<MyMazeSet[]>([]);
  const [status, setStatus] = useState<PageStatus>('loading');

  useEffect(() => {
    let isMounted = true;

    async function loadSets() {
      try {
        setStatus('loading');
        const nextSets = await getMyMazeSets();

        if (isMounted) {
          setSets(nextSets);
          setStatus('ready');
        }
      } catch {
        if (isMounted) {
          setStatus('error');
        }
      }
    }

    void loadSets();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <PageShell>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.managementTopBar}>
            <Link to={ROUTES.loungeMaze} className={styles.secondaryButton}>뒤로가기</Link>
            <Link to={ROUTES.loungeMazeMyNew} className={styles.primaryButton}>미궁 만들기</Link>
          </div>

          {status === 'loading' ? (
            <section className={styles.statePanel} aria-live="polite">내 미궁 목록을 불러오는 중입니다.</section>
          ) : null}

          {status === 'error' ? (
            <section className={styles.statePanel} role="alert">
              내 미궁 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
            </section>
          ) : null}

          {status === 'ready' && sets.length === 0 ? (
            <section className={styles.statePanel}>아직 만든 미궁이 없습니다.</section>
          ) : null}

          {status === 'ready' && sets.length > 0 ? (
            <section className={styles.myMazeList} aria-label="내가 만든 미궁 목록">
              {sets.map((set) => (
                <Link
                  key={set.id}
                  to={ROUTES.loungeMazeMyManage.replace(':setId', set.id)}
                  className={styles.myMazeItem}
                >
                  <span className={styles.myMazeThumb}>
                    {set.coverImageUrl ? <img src={set.coverImageUrl} alt="" aria-hidden="true" /> : set.title.slice(0, 1)}
                  </span>
                  <span className={styles.myMazeBody}>
                    <span className={styles.cardMeta}>
                      {getStatusLabel(set.status)} · {set.questionCount}문제
                      {set.difficultyLabel ? ` · ${set.difficultyLabel}` : ''}
                      {set.estimatedMinutes ? ` · 예상 ${set.estimatedMinutes}분` : ''}
                    </span>
                    <strong className={styles.cardTitle}>{set.title}</strong>
                    <span className={styles.cardSummary}>{set.summary || '요약이 없습니다.'}</span>
                  </span>
                </Link>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
