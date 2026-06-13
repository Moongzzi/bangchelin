import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getMazeQuizSets } from '../../features/maze/maze.api';
import type { MazeQuizSet } from '../../features/maze/types/maze.types';
import { PageShell } from '../../shared/components/layout/PageShell';
import styles from './MazePage.module.css';

type PageStatus = 'loading' | 'ready' | 'error';

export function MazeMainPage() {
  const [sets, setSets] = useState<MazeQuizSet[]>([]);
  const [status, setStatus] = useState<PageStatus>('loading');

  useEffect(() => {
    let isMounted = true;

    async function loadSets() {
      try {
        setStatus('loading');
        const nextSets = await getMazeQuizSets();

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
          <section className={styles.hero} aria-labelledby="maze-title">
            <p className={styles.eyebrow}>BANGCHELIN LOUNGE</p>
            <h1 id="maze-title" className={styles.title}>미궁</h1>
            <p className={styles.description}>
              순서대로 잠긴 문제를 풀어 마지막 문까지 도달하는 라운지 퀴즈 콘텐츠입니다.
            </p>
          </section>

          {status === 'loading' ? (
            <section className={styles.statePanel} aria-live="polite">미궁 목록을 불러오는 중입니다.</section>
          ) : null}

          {status === 'error' ? (
            <section className={styles.statePanel} role="alert">
              미궁 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </section>
          ) : null}

          {status === 'ready' && sets.length === 0 ? (
            <section className={styles.statePanel}>현재 공개된 미궁이 없습니다.</section>
          ) : null}

          {status === 'ready' && sets.length > 0 ? (
            <section className={styles.setGrid} aria-label="미궁 퀴즈셋 목록">
              {sets.map((set) => (
                <Link key={set.id} to={`/lounge/maze/${set.slug}`} className={styles.setCard}>
                  <span className={styles.cardMedia}>
                    {set.coverImageUrl ? <img src={set.coverImageUrl} alt="" aria-hidden="true" /> : set.title.slice(0, 1)}
                  </span>
                  <span className={styles.cardBody}>
                    <span className={styles.cardMeta}>
                      {set.questionCount}문제
                      {set.difficultyLabel ? ` · ${set.difficultyLabel}` : ''}
                    </span>
                    <strong className={styles.cardTitle}>{set.title}</strong>
                    <span className={styles.cardSummary}>{set.summary ?? '미궁 설명이 준비 중입니다.'}</span>
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
