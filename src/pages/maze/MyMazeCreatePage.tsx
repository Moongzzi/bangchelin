import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { createMyMazeSet, uploadMyMazeCover } from '../../features/maze/maze.user.api';
import { PageShell } from '../../shared/components/layout/PageShell';
import { ROUTES } from '../../shared/constants/routes';
import styles from './MazePage.module.css';

type Draft = {
  title: string;
  summary: string;
  description: string;
  coverImageUrl: string;
  difficultyLabel: string;
  estimatedMinutes: string;
};

const initialDraft: Draft = {
  title: '',
  summary: '',
  description: '',
  coverImageUrl: '',
  difficultyLabel: '',
  estimatedMinutes: '',
};

export function MyMazeCreatePage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  function updateDraft(partialDraft: Partial<Draft>) {
    setDraft((currentDraft) => ({ ...currentDraft, ...partialDraft }));
  }

  async function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage('');
      const coverImageUrl = await uploadMyMazeCover(file);
      updateDraft({ coverImageUrl });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '썸네일을 업로드하지 못했습니다.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await createMyMazeSet(draft);
      navigate(ROUTES.loungeMazeMy);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '미궁 정보를 저장하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.managementTopBar}>
            <Link to={ROUTES.loungeMazeMy} className={styles.secondaryButton}>뒤로가기</Link>
          </div>

          <form className={styles.mazeInfoForm} onSubmit={(event) => void handleSubmit(event)}>
            <section className={styles.formPanel} aria-labelledby="maze-create-title">
              <div>
                <p className={styles.eyebrow}>MY MAZE</p>
                <h1 id="maze-create-title" className={styles.formTitle}>미궁 정보 입력</h1>
              </div>

              {errorMessage ? (
                <p className={`${styles.feedback} ${styles.feedbackError}`} role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <div className={styles.mazeFormGrid}>
                <label className={styles.mazeField}>
                  <span>제목</span>
                  <input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} />
                </label>

                <label className={styles.mazeField}>
                  <span>난이도</span>
                  <input value={draft.difficultyLabel} onChange={(event) => updateDraft({ difficultyLabel: event.target.value })} />
                </label>

                <label className={styles.mazeField}>
                  <span>예상 시간(분)</span>
                  <input
                    type="number"
                    min="1"
                    value={draft.estimatedMinutes}
                    onChange={(event) => updateDraft({ estimatedMinutes: event.target.value })}
                  />
                </label>

                <label className={`${styles.mazeField} ${styles.mazeWideField}`}>
                  <span>요약</span>
                  <input value={draft.summary} onChange={(event) => updateDraft({ summary: event.target.value })} />
                </label>

                <label className={`${styles.mazeField} ${styles.mazeWideField}`}>
                  <span>내용</span>
                  <textarea
                    value={draft.description}
                    onChange={(event) => updateDraft({ description: event.target.value })}
                    rows={6}
                  />
                </label>

                <label className={`${styles.mazeField} ${styles.mazeWideField}`}>
                  <span>썸네일</span>
                  {draft.coverImageUrl ? (
                    <span className={styles.thumbnailPreview}>
                      <img src={draft.coverImageUrl} alt="" aria-hidden="true" />
                    </span>
                  ) : null}
                  <span className={styles.uploadControl}>
                    <input type="file" accept="image/*" onChange={(event) => void handleCoverUpload(event)} />
                    <span>{isUploading ? '업로드 중' : '파일 업로드'}</span>
                  </span>
                </label>
              </div>
            </section>

            <div className={styles.formActionRow}>
              <button type="submit" className={styles.primaryButton} disabled={isSubmitting || isUploading}>
                {isSubmitting ? '생성 중' : '생성하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
