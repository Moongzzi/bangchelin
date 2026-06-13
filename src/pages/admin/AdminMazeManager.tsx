import { type ChangeEvent, type DragEvent, useEffect, useMemo, useState } from 'react';

import {
  deleteAdminMazeQuizSet,
  getAdminMazeQuestions,
  getAdminMazeQuizSets,
  saveAdminMazeQuestions,
  saveAdminMazeQuizSet,
  uploadMazeAsset,
  type AdminMazeQuestion,
  type AdminMazeQuizSet,
} from '../../features/maze/maze.admin.api';
import type { MazeQuizSetStatus } from '../../features/maze/types/maze.types';
import styles from './AdminLoungePage.module.css';

type PageStatus = 'loading' | 'ready' | 'error';

const statusOptions: Array<{ value: MazeQuizSetStatus; label: string }> = [
  { value: 'draft', label: '초안' },
  { value: 'published', label: '공개' },
  { value: 'archived', label: '보관' },
];

function createDefaultSetInput(sortOrder: number) {
  const timestamp = Date.now();

  return {
    slug: `maze-${timestamp}`,
    title: '새 미궁',
    summary: '',
    description: '',
    coverImageUrl: '',
    hasStartPage: false,
    startImageUrl: '',
    startAnswerText: '',
    hasEndPage: false,
    endImageUrl: '',
    difficultyLabel: '',
    estimatedMinutes: '',
    status: 'draft' as MazeQuizSetStatus,
    sortOrder,
  };
}

function normalizeSetOrder(sets: AdminMazeQuizSet[]) {
  return sets.map((set, index) => ({
    ...set,
    sortOrder: (index + 1) * 10,
  }));
}

function normalizeQuestionNumbers(questions: AdminMazeQuestion[]) {
  return questions.map((question, index) => ({
    ...question,
    questionNo: index + 1,
  }));
}

function moveByIndex<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);

  if (movedItem === undefined) {
    return items;
  }

  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

export function AdminMazeManager() {
  const [sets, setSets] = useState<AdminMazeQuizSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [setDraft, setSetDraft] = useState<AdminMazeQuizSet | null>(null);
  const [questions, setQuestions] = useState<AdminMazeQuestion[]>([]);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const [uploadingKey, setUploadingKey] = useState('');
  const [draggedSetId, setDraggedSetId] = useState('');
  const [dragOverSetId, setDragOverSetId] = useState('');
  const [draggedQuestionIndex, setDraggedQuestionIndex] = useState<number | null>(null);
  const [dragOverQuestionIndex, setDragOverQuestionIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSets() {
      try {
        setStatus('loading');
        const nextSets = await getAdminMazeQuizSets();

        if (isMounted) {
          setSets(nextSets);
          setSelectedSetId(nextSets[0]?.id ?? '');
          setStatus('ready');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : '미궁 퀴즈셋을 불러오지 못했습니다.');
          setStatus('error');
        }
      }
    }

    void loadSets();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const selectedSet = sets.find((set) => set.id === selectedSetId) ?? null;
    setSetDraft(selectedSet);

    async function loadQuestions() {
      if (!selectedSet) {
        setQuestions([]);
        return;
      }

      try {
        const nextQuestions = await getAdminMazeQuestions(selectedSet.id);

        if (isMounted) {
          setQuestions(nextQuestions);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : '미궁 문제를 불러오지 못했습니다.');
        }
      }
    }

    void loadQuestions();

    return () => {
      isMounted = false;
    };
  }, [selectedSetId]);

  const selectedSet = useMemo(
    () => sets.find((set) => set.id === selectedSetId) ?? null,
    [selectedSetId, sets],
  );
  const isSetDirty = Boolean(setDraft && selectedSet && JSON.stringify(setDraft) !== JSON.stringify(selectedSet));
  const isSetOrderDirty = sets.some((set, index) => set.sortOrder !== (index + 1) * 10);

  function updateSetDraft(partialDraft: Partial<AdminMazeQuizSet>) {
    setSetDraft((currentDraft) => currentDraft ? { ...currentDraft, ...partialDraft } : currentDraft);
  }

  function updateQuestion(questionIndex: number, partialQuestion: Partial<AdminMazeQuestion>) {
    setQuestions((currentQuestions) => currentQuestions.map((question, index) => (
      index === questionIndex ? { ...question, ...partialQuestion } : question
    )));
  }

  async function handleCreateSet() {
    try {
      setSavingKey('create-set');
      setErrorMessage('');
      const savedSet = await saveAdminMazeQuizSet(createDefaultSetInput((sets.length + 1) * 10));

      setSets((currentSets) => normalizeSetOrder([...currentSets, savedSet]));
      setSelectedSetId(savedSet.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '미궁 퀴즈셋을 추가하지 못했습니다.');
    } finally {
      setSavingKey('');
    }
  }

  async function handleSaveSet() {
    if (!setDraft) {
      return;
    }

    try {
      setSavingKey('set');
      setErrorMessage('');
      const savedSet = await saveAdminMazeQuizSet(setDraft);

      setSets((currentSets) => currentSets.map((set) => (
        set.id === savedSet.id ? savedSet : set
      )));
      setSetDraft(savedSet);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '미궁 퀴즈셋을 저장하지 못했습니다.');
    } finally {
      setSavingKey('');
    }
  }

  async function handleSaveSetOrder() {
    try {
      setSavingKey('set-order');
      setErrorMessage('');
      const orderedSets = normalizeSetOrder(sets);
      const savedSets = await Promise.all(orderedSets.map((set) => saveAdminMazeQuizSet(set)));

      setSets(savedSets.sort((left, right) => left.sortOrder - right.sortOrder));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '미궁 퀴즈셋 순서를 저장하지 못했습니다.');
    } finally {
      setSavingKey('');
    }
  }

  async function handleDeleteSet() {
    if (!setDraft) {
      return;
    }

    const shouldDelete = window.confirm(`"${setDraft.title}" 퀴즈셋을 삭제할까요? 등록된 문제와 정답도 함께 삭제됩니다.`);

    if (!shouldDelete) {
      return;
    }

    try {
      setSavingKey('delete-set');
      setErrorMessage('');
      await deleteAdminMazeQuizSet(setDraft.id);

      setSets((currentSets) => {
        const nextSets = normalizeSetOrder(currentSets.filter((set) => set.id !== setDraft.id));
        setSelectedSetId(nextSets[0]?.id ?? '');
        return nextSets;
      });
      setSetDraft(null);
      setQuestions([]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '미궁 퀴즈셋을 삭제하지 못했습니다.');
    } finally {
      setSavingKey('');
    }
  }

  async function handleSaveQuestions() {
    if (!setDraft) {
      return;
    }

    try {
      setSavingKey('questions');
      setErrorMessage('');
      const savedQuestions = await saveAdminMazeQuestions(setDraft.id, normalizeQuestionNumbers(questions));

      setQuestions(savedQuestions);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '미궁 문제를 저장하지 못했습니다.');
    } finally {
      setSavingKey('');
    }
  }

  async function handleAssetUpload(kind: 'cover' | 'start' | 'end' | 'question', event: ChangeEvent<HTMLInputElement>, questionIndex?: number) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !setDraft) {
      return;
    }

    try {
      const key = questionIndex === undefined ? kind : `${kind}:${questionIndex}`;
      setUploadingKey(key);
      setErrorMessage('');
      const assetUrl = await uploadMazeAsset(setDraft.id, kind, file);

      if (kind === 'cover') {
        updateSetDraft({ coverImageUrl: assetUrl });
      } else if (kind === 'start') {
        updateSetDraft({ startImageUrl: assetUrl, hasStartPage: true });
      } else if (kind === 'end') {
        updateSetDraft({ endImageUrl: assetUrl, hasEndPage: true });
      } else if (questionIndex !== undefined) {
        updateQuestion(questionIndex, { imageUrl: assetUrl });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '이미지를 업로드하지 못했습니다.');
    } finally {
      setUploadingKey('');
    }
  }

  function handleSetDrop(targetSetId: string) {
    if (!draggedSetId || draggedSetId === targetSetId) {
      setDraggedSetId('');
      setDragOverSetId('');
      return;
    }

    setSets((currentSets) => {
      const fromIndex = currentSets.findIndex((set) => set.id === draggedSetId);
      const toIndex = currentSets.findIndex((set) => set.id === targetSetId);

      return normalizeSetOrder(moveByIndex(currentSets, fromIndex, toIndex));
    });
    setDraggedSetId('');
    setDragOverSetId('');
  }

  function handleQuestionDrop(targetIndex: number) {
    if (draggedQuestionIndex === null || draggedQuestionIndex === targetIndex) {
      setDraggedQuestionIndex(null);
      setDragOverQuestionIndex(null);
      return;
    }

    setQuestions((currentQuestions) => normalizeQuestionNumbers(moveByIndex(currentQuestions, draggedQuestionIndex, targetIndex)));
    setDraggedQuestionIndex(null);
    setDragOverQuestionIndex(null);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
  }

  function handleAddQuestion() {
    if (!setDraft) {
      return;
    }

    setQuestions((currentQuestions) => [
      ...currentQuestions,
      {
        id: '',
        setId: setDraft.id,
        questionNo: currentQuestions.length + 1,
        imageUrl: '',
        answerText: '',
      },
    ]);
  }

  function handleRemoveQuestion(index: number) {
    setQuestions((currentQuestions) => normalizeQuestionNumbers(currentQuestions.filter((_, currentIndex) => currentIndex !== index)));
  }

  return (
    <section className={styles.nodePanel} aria-labelledby="maze-manager-title">
      <div className={styles.settingsHeader}>
        <div>
          <h2 id="maze-manager-title" className={styles.sectionTitle}>미궁 퀴즈셋 관리</h2>
          <p className={styles.sectionDescription}>
            퀴즈셋, 시작 페이지, 종료 페이지, 문제 이미지와 정답을 관리합니다.
          </p>
        </div>
        <button
          type="button"
          className={styles.saveButton}
          disabled={savingKey === 'create-set'}
          onClick={() => void handleCreateSet()}
        >
          {savingKey === 'create-set' ? '추가 중' : '퀴즈셋 추가'}
        </button>
      </div>

      {status === 'loading' ? <p className={styles.message}>미궁 퀴즈셋을 불러오는 중입니다.</p> : null}
      {status === 'error' || errorMessage ? <p className={styles.errorMessage} role="alert">{errorMessage}</p> : null}

      {status === 'ready' && sets.length === 0 ? (
        <p className={styles.message}>등록된 미궁 퀴즈셋이 없습니다.</p>
      ) : null}

      {sets.length > 0 ? (
        <div className={styles.mazeManagerGrid}>
          <div className={styles.mazeSetList} aria-label="미궁 퀴즈셋 목록">
            <div className={styles.listHeader}>
              <span>퀴즈셋 순서</span>
              <button
                type="button"
                className={styles.manageLink}
                disabled={!isSetOrderDirty || savingKey === 'set-order'}
                onClick={() => void handleSaveSetOrder()}
              >
                {savingKey === 'set-order' ? '저장 중' : '순서 저장'}
              </button>
            </div>
            {sets.map((set) => (
              <button
                key={set.id}
                type="button"
                draggable
                className={`${styles.mazeSetButton} ${selectedSetId === set.id ? styles.mazeSetButtonActive : ''} ${
                  dragOverSetId === set.id && draggedSetId !== set.id ? styles.dropBefore : ''
                }`}
                onClick={() => setSelectedSetId(set.id)}
                onDragStart={() => setDraggedSetId(set.id)}
                onDragOver={handleDragOver}
                onDragEnter={() => setDragOverSetId(set.id)}
                onDragEnd={() => {
                  setDraggedSetId('');
                  setDragOverSetId('');
                }}
                onDrop={() => handleSetDrop(set.id)}
              >
                <span className={styles.dragHandle} aria-hidden="true">::</span>
                <strong>{set.title}</strong>
                <span>{set.status === 'published' ? '공개 중' : set.status === 'draft' ? '초안' : '보관'} · {set.slug}</span>
              </button>
            ))}
          </div>

          {setDraft ? (
            <div className={styles.mazeEditor}>
              <div className={styles.settingsHeader}>
                <div>
                  <h3 className={styles.sectionTitle}>퀴즈셋 기본 정보</h3>
                  <p className={styles.sectionDescription}>
                    상태가 공개일 때만 사용자 미궁 목록과 플레이 진입이 허용됩니다.
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.saveButton}
                  disabled={!isSetDirty || savingKey === 'set'}
                  onClick={() => void handleSaveSet()}
                >
                  {savingKey === 'set' ? '저장 중' : '퀴즈셋 저장'}
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  disabled={savingKey === 'delete-set'}
                  onClick={() => void handleDeleteSet()}
                >
                  {savingKey === 'delete-set' ? '삭제 중' : '퀴즈셋 삭제'}
                </button>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>제목</span>
                  <input value={setDraft.title} onChange={(event) => updateSetDraft({ title: event.target.value })} />
                </label>
                <label className={styles.field}>
                  <span>난이도</span>
                  <input value={setDraft.difficultyLabel} onChange={(event) => updateSetDraft({ difficultyLabel: event.target.value })} />
                </label>
                <label className={styles.field}>
                  <span>예상 시간(분)</span>
                  <input
                    type="number"
                    min="1"
                    value={setDraft.estimatedMinutes}
                    onChange={(event) => updateSetDraft({ estimatedMinutes: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span>상태</span>
                  <select value={setDraft.status} onChange={(event) => updateSetDraft({ status: event.target.value as MazeQuizSetStatus })}>
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className={`${styles.field} ${styles.wideField}`}>
                  <span>요약</span>
                  <input value={setDraft.summary} onChange={(event) => updateSetDraft({ summary: event.target.value })} />
                </label>
                <label className={`${styles.field} ${styles.wideField}`}>
                  <span>설명</span>
                  <textarea value={setDraft.description} onChange={(event) => updateSetDraft({ description: event.target.value })} rows={4} />
                </label>
                <label className={`${styles.field} ${styles.wideField}`}>
                  <span>표지 이미지 URL</span>
                  <input value={setDraft.coverImageUrl} onChange={(event) => updateSetDraft({ coverImageUrl: event.target.value })} />
                  <span className={styles.uploadRow}>
                    <input type="file" accept="image/*" onChange={(event) => void handleAssetUpload('cover', event)} />
                    <span>{uploadingKey === 'cover' ? '업로드 중' : '표지 이미지 업로드'}</span>
                  </span>
                </label>
              </div>

              <div className={styles.mazeOptionPanel}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={setDraft.hasStartPage}
                    onChange={(event) => updateSetDraft({ hasStartPage: event.target.checked })}
                  />
                  <span>시작 페이지 사용</span>
                </label>
                {setDraft.hasStartPage ? (
                  <div className={styles.formGrid}>
                    <label className={`${styles.field} ${styles.wideField}`}>
                      <span>시작 이미지 URL</span>
                      <input value={setDraft.startImageUrl} onChange={(event) => updateSetDraft({ startImageUrl: event.target.value })} />
                      <span className={styles.uploadRow}>
                        <input type="file" accept="image/*" onChange={(event) => void handleAssetUpload('start', event)} />
                        <span>{uploadingKey === 'start' ? '업로드 중' : '시작 이미지 업로드'}</span>
                      </span>
                    </label>
                    <label className={`${styles.field} ${styles.wideField}`}>
                      <span>1번 문제로 넘어갈 정답</span>
                      <input value={setDraft.startAnswerText} onChange={(event) => updateSetDraft({ startAnswerText: event.target.value })} />
                    </label>
                  </div>
                ) : null}
              </div>

              <div className={styles.mazeOptionPanel}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={setDraft.hasEndPage}
                    onChange={(event) => updateSetDraft({ hasEndPage: event.target.checked })}
                  />
                  <span>종료 페이지 사용</span>
                </label>
                {setDraft.hasEndPage ? (
                  <label className={`${styles.field} ${styles.wideField}`}>
                    <span>종료 이미지 URL</span>
                    <input value={setDraft.endImageUrl} onChange={(event) => updateSetDraft({ endImageUrl: event.target.value })} />
                    <span className={styles.uploadRow}>
                      <input type="file" accept="image/*" onChange={(event) => void handleAssetUpload('end', event)} />
                      <span>{uploadingKey === 'end' ? '업로드 중' : '종료 이미지 업로드'}</span>
                    </span>
                  </label>
                ) : null}
              </div>

              <div className={styles.settingsHeader}>
                <div>
                  <h3 className={styles.sectionTitle}>미궁 문제</h3>
                  <p className={styles.sectionDescription}>왼쪽 손잡이를 잡고 드래그한 뒤 문제 저장을 누르면 순서가 반영됩니다.</p>
                </div>
                <div className={styles.buttonGroup}>
                  <button type="button" className={styles.manageLink} onClick={handleAddQuestion}>문제 추가</button>
                  <button
                    type="button"
                    className={styles.saveButton}
                    disabled={savingKey === 'questions'}
                    onClick={() => void handleSaveQuestions()}
                  >
                    {savingKey === 'questions' ? '저장 중' : '문제 저장'}
                  </button>
                </div>
              </div>

              <div className={styles.mazeQuestionList}>
                {questions.map((question, index) => (
                  <section
                    key={question.id || `new-${index}`}
                    className={`${styles.mazeQuestionPanel} ${
                      dragOverQuestionIndex === index && draggedQuestionIndex !== index ? styles.dropBefore : ''
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={() => setDragOverQuestionIndex(index)}
                    onDrop={() => handleQuestionDrop(index)}
                  >
                    <div
                      className={styles.dragHandleLarge}
                      draggable
                      role="button"
                      tabIndex={0}
                      aria-label={`${index + 1}번 문제 순서 이동`}
                      onDragStart={() => setDraggedQuestionIndex(index)}
                      onDragEnd={() => {
                        setDraggedQuestionIndex(null);
                        setDragOverQuestionIndex(null);
                      }}
                    >
                      ::
                    </div>
                    <div className={styles.questionContent}>
                      <div className={styles.questionHeader}>
                        <strong>{index + 1}번 문제</strong>
                        <button type="button" className={styles.manageLink} onClick={() => handleRemoveQuestion(index)}>삭제</button>
                      </div>
                      <div className={styles.formGrid}>
                        <label className={`${styles.field} ${styles.wideField}`}>
                          <span>문제 이미지 URL</span>
                          <input value={question.imageUrl} onChange={(event) => updateQuestion(index, { imageUrl: event.target.value })} />
                          <span className={styles.uploadRow}>
                            <input type="file" accept="image/*" onChange={(event) => void handleAssetUpload('question', event, index)} />
                            <span>{uploadingKey === `question:${index}` ? '업로드 중' : '문제 이미지 업로드'}</span>
                          </span>
                        </label>
                        <label className={`${styles.field} ${styles.wideField}`}>
                          <span>정답</span>
                          <input value={question.answerText} onChange={(event) => updateQuestion(index, { answerText: event.target.value })} />
                        </label>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
