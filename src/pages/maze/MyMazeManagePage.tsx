import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  deleteMyMazeQuestion,
  getMyMazeAnswerRoutes,
  getMyMazeQuestions,
  getMyMazeSet,
  saveMyMazeAnswerRoutes,
  saveMyMazeQuestionOrder,
  setMyMazeStartQuestion,
  updateMyMazeSet,
  uploadMyMazeCover,
  type MyMazeAnswerRoute,
  type MyMazeQuestion,
  type MyMazeSet,
} from '../../features/maze/maze.user.api';
import type { MazeQuizSetStatus } from '../../features/maze/types/maze.types';
import { PageShell } from '../../shared/components/layout/PageShell';
import { Popup, type PopupAction } from '../../shared/components/popup';
import { ROUTES } from '../../shared/constants/routes';
import styles from './MazePage.module.css';

type PageStatus = 'loading' | 'ready' | 'error' | 'notFound';
type ActiveTab = 'info' | 'questions';
type Draft = {
  title: string;
  summary: string;
  description: string;
  coverImageUrl: string;
  difficultyLabel: string;
  estimatedMinutes: string;
  status: MazeQuizSetStatus;
};

const statusOptions: Array<{ value: MazeQuizSetStatus; label: string }> = [
  { value: 'draft', label: '초안' },
  { value: 'published', label: '공개' },
  { value: 'archived', label: '보관' },
];

function toDraft(set: MyMazeSet): Draft {
  return {
    title: set.title,
    summary: set.summary,
    description: set.description,
    coverImageUrl: set.coverImageUrl,
    difficultyLabel: set.difficultyLabel,
    estimatedMinutes: set.estimatedMinutes,
    status: set.status,
  };
}

function moveByIndex(items: MyMazeQuestion[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);

  if (!movedItem) {
    return items;
  }

  nextItems.splice(toIndex, 0, movedItem);
  return nextItems.map((item, index) => ({ ...item, questionNo: index + 1 }));
}

function createEmptyRoute(questionId: string, sortOrder: number): MyMazeAnswerRoute {
  return {
    id: `draft-${Date.now()}-${crypto.randomUUID()}`,
    questionId,
    answerText: '',
    targetQuestionId: '',
    isEnding: false,
    sortOrder,
  };
}

export function MyMazeManagePage() {
  const { setId = '' } = useParams();
  const [activeTab, setActiveTab] = useState<ActiveTab>('info');
  const [set, setSet] = useState<MyMazeSet | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [questions, setQuestions] = useState<MyMazeQuestion[]>([]);
  const [routesByQuestionId, setRoutesByQuestionId] = useState<Record<string, MyMazeAnswerRoute[]>>({});
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [openRoutesQuestionId, setOpenRoutesQuestionId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MyMazeQuestion | null>(null);
  const [draggedQuestionIndex, setDraggedQuestionIndex] = useState<number | null>(null);
  const [dragOverQuestionIndex, setDragOverQuestionIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [savingKey, setSavingKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const originalDraft = useMemo(() => (set ? toDraft(set) : null), [set]);
  const isInfoDirty = Boolean(draft && originalDraft && JSON.stringify(draft) !== JSON.stringify(originalDraft));
  const isAllSelected = questions.length > 0 && selectedQuestionIds.length === questions.length;

  useEffect(() => {
    let isMounted = true;

    async function loadMaze() {
      try {
        setStatus('loading');
        setErrorMessage('');
        const nextSet = await getMyMazeSet(setId);

        if (!nextSet) {
          if (isMounted) {
            setStatus('notFound');
          }
          return;
        }

        const [nextQuestions, nextRoutes] = await Promise.all([
          getMyMazeQuestions(nextSet.id),
          getMyMazeAnswerRoutes(nextSet.id),
        ]);

        if (isMounted) {
          setSet(nextSet);
          setDraft(toDraft(nextSet));
          setQuestions(nextQuestions);
          setRoutesByQuestionId(nextRoutes.reduce<Record<string, MyMazeAnswerRoute[]>>((items, route) => {
            items[route.questionId] = [...(items[route.questionId] ?? []), route];
            return items;
          }, {}));
          setStatus('ready');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : '미궁 관리 정보를 불러오지 못했습니다.');
          setStatus('error');
        }
      }
    }

    void loadMaze();

    return () => {
      isMounted = false;
    };
  }, [setId]);

  function updateDraft(partialDraft: Partial<Draft>) {
    setDraft((currentDraft) => currentDraft ? { ...currentDraft, ...partialDraft } : currentDraft);
  }

  function updateQuestionRoutes(questionId: string, updater: (routes: MyMazeAnswerRoute[]) => MyMazeAnswerRoute[]) {
    setRoutesByQuestionId((currentRoutes) => ({
      ...currentRoutes,
      [questionId]: updater(currentRoutes[questionId] ?? []),
    }));
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
  }

  async function handleInfoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft || !set) {
      return;
    }

    try {
      setSavingKey('info');
      setErrorMessage('');
      const nextSet = await updateMyMazeSet(set.id, draft);
      setSet(nextSet);
      setDraft(toDraft(nextSet));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '미궁 정보를 저장하지 못했습니다.');
    } finally {
      setSavingKey('');
    }
  }

  async function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setSavingKey('cover');
      setErrorMessage('');
      const coverImageUrl = await uploadMyMazeCover(file);
      updateDraft({ coverImageUrl });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '썸네일을 업로드하지 못했습니다.');
    } finally {
      setSavingKey('');
    }
  }

  async function handleQuestionDrop(targetIndex: number) {
    if (draggedQuestionIndex === null || draggedQuestionIndex === targetIndex) {
      setDraggedQuestionIndex(null);
      setDragOverQuestionIndex(null);
      return;
    }

    const nextQuestions = moveByIndex(questions, draggedQuestionIndex, targetIndex);
    setQuestions(nextQuestions);
    setDraggedQuestionIndex(null);
    setDragOverQuestionIndex(null);

    try {
      setSavingKey('order');
      await saveMyMazeQuestionOrder(nextQuestions);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문제 순서를 저장하지 못했습니다.');
    } finally {
      setSavingKey('');
    }
  }

  async function handleSetStartQuestion(questionId: string) {
    if (!set) {
      return;
    }

    try {
      setSavingKey(`start:${questionId}`);
      setErrorMessage('');
      await setMyMazeStartQuestion(set.id, questionId);
      setQuestions((currentQuestions) => currentQuestions.map((question) => ({
        ...question,
        isStart: question.id === questionId,
      })));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '시작 지점을 저장하지 못했습니다.');
    } finally {
      setSavingKey('');
    }
  }

  async function handleDeleteQuestion() {
    if (!deleteTarget) {
      return;
    }

    try {
      setSavingKey(`delete:${deleteTarget.id}`);
      setErrorMessage('');
      await deleteMyMazeQuestion(deleteTarget.id);
      setQuestions((currentQuestions) => currentQuestions
        .filter((question) => question.id !== deleteTarget.id)
        .map((question, index) => ({ ...question, questionNo: index + 1 })));
      setSelectedQuestionIds((currentIds) => currentIds.filter((id) => id !== deleteTarget.id));
      setOpenRoutesQuestionId((currentId) => currentId === deleteTarget.id ? '' : currentId);
      setDeleteTarget(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문제를 삭제하지 못했습니다.');
    } finally {
      setSavingKey('');
    }
  }

  async function handleSaveRoutes(questionId: string) {
    try {
      setSavingKey(`routes:${questionId}`);
      setErrorMessage('');
      const savedRoutes = await saveMyMazeAnswerRoutes(questionId, routesByQuestionId[questionId] ?? []);
      setRoutesByQuestionId((currentRoutes) => ({
        ...currentRoutes,
        [questionId]: savedRoutes,
      }));
      setOpenRoutesQuestionId('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '이동 설정을 저장하지 못했습니다.');
    } finally {
      setSavingKey('');
    }
  }

  const deleteActions: PopupAction[] = [
    {
      label: '삭제',
      variant: 'filled',
      onClick: () => void handleDeleteQuestion(),
    },
    {
      label: '취소',
      variant: 'outline',
      tone: 'neutral',
      onClick: () => setDeleteTarget(null),
    },
  ];

  return (
    <PageShell>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.managementTopBar}>
            <Link to={ROUTES.loungeMazeMy} className={styles.secondaryButton}>뒤로가기</Link>
          </div>

          {status === 'loading' ? (
            <section className={styles.statePanel} aria-live="polite">미궁 관리 정보를 불러오는 중입니다.</section>
          ) : null}

          {status === 'error' || errorMessage ? (
            <section className={styles.statePanel} role="alert">{errorMessage}</section>
          ) : null}

          {status === 'notFound' ? (
            <section className={styles.statePanel}>존재하지 않거나 내 미궁이 아닙니다.</section>
          ) : null}

          {status === 'ready' && set && draft ? (
            <section className={styles.manageShell} aria-labelledby="my-maze-manage-title">
              <div className={styles.manageHeader}>
                <div>
                  <p className={styles.eyebrow}>MY MAZE</p>
                  <h1 id="my-maze-manage-title" className={styles.formTitle}>{set.title}</h1>
                </div>
              </div>

              <div className={styles.manageTabs} aria-label="미궁 관리 메뉴">
                <button type="button" className={`${styles.manageTab} ${activeTab === 'info' ? styles.manageTabActive : ''}`} aria-pressed={activeTab === 'info'} onClick={() => setActiveTab('info')}>
                  정보 관리
                </button>
                <button type="button" className={`${styles.manageTab} ${activeTab === 'questions' ? styles.manageTabActive : ''}`} aria-pressed={activeTab === 'questions'} onClick={() => setActiveTab('questions')}>
                  문제 관리
                </button>
              </div>

              {activeTab === 'info' ? (
                <form className={styles.mazeInfoForm} onSubmit={(event) => void handleInfoSubmit(event)}>
                  <section className={styles.formPanel} aria-label="미궁 정보 관리">
                    <div className={styles.mazeFormGrid}>
                      <label className={styles.mazeField}>
                        <span>제목</span>
                        <input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} />
                      </label>
                      <label className={styles.mazeField}>
                        <span>공개 상태</span>
                        <select value={draft.status} onChange={(event) => updateDraft({ status: event.target.value as MazeQuizSetStatus })}>
                          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label className={styles.mazeField}>
                        <span>난이도</span>
                        <input value={draft.difficultyLabel} onChange={(event) => updateDraft({ difficultyLabel: event.target.value })} />
                      </label>
                      <label className={styles.mazeField}>
                        <span>예상 시간(분)</span>
                        <input type="number" min="1" value={draft.estimatedMinutes} onChange={(event) => updateDraft({ estimatedMinutes: event.target.value })} />
                      </label>
                      <label className={`${styles.mazeField} ${styles.mazeWideField}`}>
                        <span>요약</span>
                        <input value={draft.summary} onChange={(event) => updateDraft({ summary: event.target.value })} />
                      </label>
                      <label className={`${styles.mazeField} ${styles.mazeWideField}`}>
                        <span>내용</span>
                        <textarea value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} rows={6} />
                      </label>
                      <label className={`${styles.mazeField} ${styles.mazeWideField}`}>
                        <span>썸네일</span>
                        {draft.coverImageUrl ? <span className={styles.thumbnailPreview}><img src={draft.coverImageUrl} alt="" aria-hidden="true" /></span> : null}
                        <span className={styles.uploadControl}>
                          <input type="file" accept="image/*" onChange={(event) => void handleCoverUpload(event)} />
                          <span>{savingKey === 'cover' ? '업로드 중' : '파일 업로드'}</span>
                        </span>
                      </label>
                    </div>
                  </section>
                  <div className={styles.formActionRow}>
                    <button type="submit" className={styles.primaryButton} disabled={!isInfoDirty || savingKey === 'info'}>
                      {savingKey === 'info' ? '저장 중' : '저장'}
                    </button>
                  </div>
                </form>
              ) : null}

              {activeTab === 'questions' ? (
                <section className={styles.questionManagePanel} aria-label="미궁 문제 관리">
                  <label className={styles.selectAllRow}>
                    <input type="checkbox" checked={isAllSelected} onChange={(event) => setSelectedQuestionIds(event.target.checked ? questions.map((question) => question.id) : [])} />
                    <span>전체 선택</span>
                  </label>

                  {questions.length === 0 ? <section className={styles.darkStatePanel}>등록된 문제가 없습니다.</section> : null}

                  {questions.map((question, index) => {
                    const routes = routesByQuestionId[question.id] ?? [];
                    const isRoutesOpen = openRoutesQuestionId === question.id;

                    return (
                      <article key={question.id} className={`${styles.problemCard} ${dragOverQuestionIndex === index && draggedQuestionIndex !== index ? styles.problemCardDropTarget : ''}`} onDragOver={handleDragOver} onDragEnter={() => setDragOverQuestionIndex(index)} onDrop={() => void handleQuestionDrop(index)}>
                        <div className={styles.problemCardHeader}>
                          <div className={styles.problemIdentity}>
                            <input type="checkbox" checked={selectedQuestionIds.includes(question.id)} aria-label={`${question.title} 선택`} onChange={(event) => setSelectedQuestionIds((currentIds) => event.target.checked ? [...currentIds, question.id] : currentIds.filter((id) => id !== question.id))} />
                            <span className={styles.problemDragHandle} draggable role="button" tabIndex={0} aria-label={`${question.title} 순서 이동`} onDragStart={() => setDraggedQuestionIndex(index)} onDragEnd={() => { setDraggedQuestionIndex(null); setDragOverQuestionIndex(null); }}>
                              ::
                            </span>
                            <strong>[{question.questionNo.toString().padStart(5, '0')}] {question.title}</strong>
                          </div>

                          <div className={styles.problemActions}>
                            <button type="button" className={`${styles.outlineActionButton} ${question.isStart ? styles.outlineActionButtonActive : ''}`} disabled={savingKey === `start:${question.id}`} onClick={() => void handleSetStartQuestion(question.id)}>
                              {question.isStart ? '시작 지점' : '시작 지점 설정'}
                            </button>
                            <button type="button" className={styles.outlineActionButton} onClick={() => setOpenRoutesQuestionId(isRoutesOpen ? '' : question.id)}>
                              이동
                            </button>
                            <button type="button" className={styles.outlineActionButton} onClick={() => setDeleteTarget(question)}>
                              삭제
                            </button>
                          </div>
                        </div>

                        {isRoutesOpen ? (
                          <div className={styles.routeEditor}>
                            {routes.length === 0 ? <p className={styles.routeHint}>등록된 정답이 없습니다. 정답 추가로 정답과 다음 문제를 지정하세요.</p> : null}
                            {routes.map((route, routeIndex) => (
                              <div key={route.id} className={styles.routeRow}>
                                <input value={route.answerText} onChange={(event) => updateQuestionRoutes(question.id, (currentRoutes) => currentRoutes.map((currentRoute) => currentRoute.id === route.id ? { ...currentRoute, answerText: event.target.value } : currentRoute))} placeholder="정답" />
                                <span aria-hidden="true">-&gt;</span>
                                <select value={route.isEnding ? 'ending' : route.targetQuestionId} onChange={(event) => updateQuestionRoutes(question.id, (currentRoutes) => currentRoutes.map((currentRoute) => currentRoute.id === route.id ? { ...currentRoute, isEnding: event.target.value === 'ending', targetQuestionId: event.target.value === 'ending' ? '' : event.target.value } : currentRoute))}>
                                  <option value="">이동할 문제 선택</option>
                                  {questions.filter((item) => item.id !== question.id).map((item) => <option key={item.id} value={item.id}>[{item.questionNo.toString().padStart(5, '0')}] {item.title}</option>)}
                                  <option value="ending">엔딩(다음 없음)</option>
                                </select>
                                <button type="button" className={styles.iconTextButton} aria-label={`${routeIndex + 1}번째 정답 이동 삭제`} onClick={() => updateQuestionRoutes(question.id, (currentRoutes) => currentRoutes.filter((currentRoute) => currentRoute.id !== route.id))}>
                                  삭제
                                </button>
                              </div>
                            ))}
                            <div className={styles.routeEditorActions}>
                              <button type="button" className={styles.secondaryButton} onClick={() => updateQuestionRoutes(question.id, (currentRoutes) => [...currentRoutes, createEmptyRoute(question.id, currentRoutes.length + 1)])}>
                                정답 추가
                              </button>
                              <span />
                              <button type="button" className={styles.secondaryButton} onClick={() => setOpenRoutesQuestionId('')}>닫기</button>
                              <button type="button" className={styles.primaryButton} disabled={savingKey === `routes:${question.id}`} onClick={() => void handleSaveRoutes(question.id)}>
                                {savingKey === `routes:${question.id}` ? '저장 중' : '저장'}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </section>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>

      <Popup open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="문제를 삭제할까요?" description={deleteTarget ? `${deleteTarget.title} 문제를 삭제합니다. 저장된 정답 이동 설정도 함께 삭제됩니다.` : undefined} actions={deleteActions} role="alertdialog" />
    </PageShell>
  );
}
