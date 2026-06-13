import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type PointerEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  getAdminLoungeNode,
  getAdminLoungeSettings,
  updateAdminLoungeNode,
  uploadLoungeNodeAsset,
  type AdminLoungeNodeUpdateInput,
  type LoungeAssetKind,
} from '../../features/lounge/lounge.admin.api';
import type { LoungeAccessLevel, LoungeNode, LoungeSettings } from '../../features/lounge/types/lounge.types';
import { AdminHeader } from '../../shared/components/layout/AdminHeader';
import { Footer } from '../../shared/components/layout/Footer';
import { ROUTES } from '../../shared/constants/routes';
import { colors } from '../../shared/styles/tokens/colors';
import { AdminMazeManager } from './AdminMazeManager';
import styles from './AdminLoungePage.module.css';

type PageStatus = 'loading' | 'ready' | 'error' | 'notFound';
type ContentTab = 'node' | 'maze';
type NodeDraft = AdminLoungeNodeUpdateInput;
type PositionEditorStyle = CSSProperties & {
  '--admin-position-map-image'?: string;
};

const typeLabelMap = {
  game: '게임',
  quiz: '퀴즈',
  event: '이벤트',
  tool: '도구',
} as const;

function toDraft(node: LoungeNode): NodeDraft {
  return {
    id: node.id,
    contentId: node.content.id,
    isEnabled: node.isEnabled,
    accessLevel: node.content.accessLevel,
    nodeLabel: node.nodeLabel ?? '',
    nodeIconUrl: node.nodeIconUrl ?? '',
    nodeThemeColor: node.nodeThemeColor || '#8B1E2D',
    nodeVariant: node.nodeVariant,
    thumbnailUrl: node.content.thumbnailUrl ?? '',
    mapX: node.mapX,
    mapY: node.mapY,
    sortOrder: node.sortOrder,
  };
}

function isSameDraft(left: NodeDraft, right: NodeDraft) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function toPublicToggleAccessLevel(accessLevel: LoungeAccessLevel, isPublic: boolean): LoungeAccessLevel {
  if (isPublic) {
    return 'public';
  }

  return accessLevel === 'admin' || accessLevel === 'hidden' ? accessLevel : 'member';
}

export function AdminLoungeContentPage() {
  const { nodeId = '' } = useParams();
  const [node, setNode] = useState<LoungeNode | null>(null);
  const [draft, setDraft] = useState<NodeDraft | null>(null);
  const [settings, setSettings] = useState<LoungeSettings | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [activeTab, setActiveTab] = useState<ContentTab>('node');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadNode() {
      try {
        setStatus('loading');
        const [nextNode, nextSettings] = await Promise.all([
          getAdminLoungeNode(nodeId),
          getAdminLoungeSettings(),
        ]);

        if (!nextNode) {
          if (isMounted) {
            setStatus('notFound');
          }
          return;
        }

        if (isMounted) {
          setNode(nextNode);
          setDraft(toDraft(nextNode));
          setSettings(nextSettings);
          setActiveTab('node');
          setStatus('ready');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : '콘텐츠 관리 정보를 불러오지 못했습니다.');
          setStatus('error');
        }
      }
    }

    void loadNode();

    return () => {
      isMounted = false;
    };
  }, [nodeId]);

  const originalDraft = useMemo(() => (node ? toDraft(node) : null), [node]);
  const isDirty = Boolean(draft && originalDraft && !isSameDraft(draft, originalDraft));
  const isMazeContent = node?.content.slug === 'maze';
  const hasMapBackgroundImage = Boolean(settings?.mapBackgroundMode === 'image' && settings.mapBackgroundUrl);
  const positionEditorStyle: PositionEditorStyle = hasMapBackgroundImage
    ? {
        '--admin-position-map-image': `url("${settings?.mapBackgroundUrl}")`,
      }
    : {};

  const pageStyle = {
    '--admin-lounge-background': colors.background.default,
    '--admin-lounge-text': colors.text.primary,
    '--admin-lounge-muted': colors.text.tertiary,
    '--admin-lounge-panel': colors.background.elevated,
    '--admin-lounge-border': colors.border.subtle,
    '--admin-lounge-brand': colors.brand.primary,
    '--admin-lounge-brand-hover': colors.brand.primaryHover,
    '--admin-lounge-error': colors.semantic.error,
  } as CSSProperties;

  function updateDraft(partialDraft: Partial<NodeDraft>) {
    setDraft((currentDraft) => currentDraft ? { ...currentDraft, ...partialDraft } : currentDraft);
  }

  function updateDraftPosition(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextMapX = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const nextMapY = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));

    event.currentTarget.setPointerCapture(event.pointerId);
    updateDraft({
      mapX: Number(nextMapX.toFixed(1)),
      mapY: Number(nextMapY.toFixed(1)),
    });
  }

  async function handleAssetUpload(kind: LoungeAssetKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !draft) {
      return;
    }

    try {
      const key = `${draft.id}:${kind}`;
      setUploadingKey(key);
      setErrorMessage('');
      const assetUrl = await uploadLoungeNodeAsset(draft.id, kind, file);

      updateDraft(kind === 'pin'
        ? { nodeIconUrl: assetUrl }
        : { thumbnailUrl: assetUrl });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '이미지를 업로드하지 못했습니다.');
    } finally {
      setUploadingKey('');
    }
  }

  async function handleSave() {
    if (!draft) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      const updatedNode = await updateAdminLoungeNode(draft);

      if (updatedNode) {
        setNode(updatedNode);
        setDraft(toDraft(updatedNode));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '콘텐츠 노드를 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text)]">
      <AdminHeader />
      <main>
        <section className={styles.page} style={pageStyle}>
          <div className={styles.inner}>
            <Link to={ROUTES.adminLounge} className={styles.backLink}>라운지 관리로 돌아가기</Link>

            {status === 'loading' ? (
              <p className={styles.message}>콘텐츠 관리 정보를 불러오는 중입니다.</p>
            ) : null}

            {status === 'error' || errorMessage ? (
              <p className={styles.errorMessage} role="alert">{errorMessage}</p>
            ) : null}

            {status === 'notFound' ? (
              <p className={styles.message}>존재하지 않는 라운지 콘텐츠 노드입니다.</p>
            ) : null}

            {status === 'ready' && node && draft ? (
              <>
                <div className={styles.titleRow}>
                  <div>
                    <h1 className={styles.title}>{node.content.title}</h1>
                    <p className={styles.description}>
                      {typeLabelMap[node.content.contentType]} · {node.content.slug}
                    </p>
                  </div>
                  <span className={styles.countBadge}>콘텐츠 관리</span>
                </div>

                <div className={styles.optionTabs} aria-label="콘텐츠 관리 메뉴">
                  <button
                    type="button"
                    className={`${styles.filterButton} ${activeTab === 'node' ? styles.filterButtonActive : ''}`}
                    aria-pressed={activeTab === 'node'}
                    onClick={() => setActiveTab('node')}
                  >
                    노드 관리
                  </button>
                  {isMazeContent ? (
                    <button
                      type="button"
                      className={`${styles.filterButton} ${activeTab === 'maze' ? styles.filterButtonActive : ''}`}
                      aria-pressed={activeTab === 'maze'}
                      onClick={() => setActiveTab('maze')}
                    >
                      미궁 관리
                    </button>
                  ) : null}
                </div>

                {activeTab === 'node' ? (
                  <section className={styles.nodePanel} aria-labelledby="node-options-title">
                    <div className={styles.settingsHeader}>
                      <div>
                        <h2 id="node-options-title" className={styles.sectionTitle}>콘텐츠 노드 관리</h2>
                        <p className={styles.sectionDescription}>
                          라운지 지도와 목록에 표시되는 노드 이름, 색상, 위치, 썸네일, 공개 조건을 관리합니다.
                        </p>
                      </div>
                      <button
                        type="button"
                        className={styles.saveButton}
                        disabled={!isDirty || isSaving}
                        onClick={() => void handleSave()}
                      >
                        {isSaving ? '저장 중' : '저장'}
                      </button>
                    </div>

                    <div className={styles.nodeSummary}>
                      <span
                        className={styles.nodePreview}
                        style={{ '--node-color': draft.nodeThemeColor || '#8B1E2D' } as CSSProperties}
                        aria-hidden="true"
                      >
                        {draft.nodeIconUrl || draft.thumbnailUrl ? (
                          <img src={draft.nodeIconUrl || draft.thumbnailUrl} alt="" />
                        ) : (
                          <span>{draft.nodeLabel.slice(0, 1) || node.content.title.slice(0, 1)}</span>
                        )}
                      </span>
                      <div className={styles.nodeText}>
                        <strong>{draft.nodeLabel || node.content.title}</strong>
                        <span>{node.content.routePath}</span>
                      </div>
                      <div className={styles.toggleStack}>
                        <label className={styles.toggleLabel}>
                          <input
                            type="checkbox"
                            checked={draft.isEnabled}
                            onChange={(event) => updateDraft({ isEnabled: event.target.checked })}
                          />
                          <span>활성</span>
                        </label>
                        <label className={styles.toggleLabel}>
                          <input
                            type="checkbox"
                            checked={draft.accessLevel === 'public'}
                            onChange={(event) => updateDraft({
                              accessLevel: toPublicToggleAccessLevel(draft.accessLevel, event.target.checked),
                            })}
                          />
                          <span>비로그인 유저에게 제공</span>
                        </label>
                      </div>
                    </div>

                    <div className={styles.formGrid}>
                      <label className={styles.field}>
                        <span>노드 이름</span>
                        <input
                          value={draft.nodeLabel}
                          onChange={(event) => updateDraft({ nodeLabel: event.target.value })}
                          placeholder={node.content.title}
                        />
                      </label>
                      <label className={styles.field}>
                        <span>테마 타입</span>
                        <input
                          value={draft.nodeVariant}
                          onChange={(event) => updateDraft({ nodeVariant: event.target.value })}
                          placeholder="quiz"
                        />
                      </label>
                      <label className={styles.field}>
                        <span>테마 컬러</span>
                        <span className={styles.colorField}>
                          <input
                            type="color"
                            value={draft.nodeThemeColor || '#8B1E2D'}
                            onChange={(event) => updateDraft({ nodeThemeColor: event.target.value })}
                          />
                          <input
                            value={draft.nodeThemeColor}
                            onChange={(event) => updateDraft({ nodeThemeColor: event.target.value })}
                            placeholder="#8B1E2D"
                          />
                        </span>
                      </label>
                      <label className={styles.field}>
                        <span>정렬 순서</span>
                        <input
                          type="number"
                          value={draft.sortOrder}
                          onChange={(event) => updateDraft({ sortOrder: Number(event.target.value) })}
                        />
                      </label>
                      <label className={styles.field}>
                        <span>지도 X 위치</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={draft.mapX}
                          onChange={(event) => updateDraft({ mapX: Number(event.target.value) })}
                        />
                      </label>
                      <label className={styles.field}>
                        <span>지도 Y 위치</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={draft.mapY}
                          onChange={(event) => updateDraft({ mapY: Number(event.target.value) })}
                        />
                      </label>
                      <div className={`${styles.field} ${styles.positionField}`}>
                        <span>지도 위치 미리보기</span>
                        <div
                          className={`${styles.positionEditor} ${
                            hasMapBackgroundImage ? styles.positionEditorWithImage : ''
                          }`}
                          style={positionEditorStyle}
                          role="slider"
                          aria-label={`${node.content.title} 지도 위치`}
                          aria-valuetext={`X ${draft.mapX}, Y ${draft.mapY}`}
                          tabIndex={0}
                          onPointerDown={(event) => updateDraftPosition(event)}
                          onPointerMove={(event) => {
                            if (event.buttons === 1) {
                              updateDraftPosition(event);
                            }
                          }}
                        >
                          <span className={styles.positionIsland} aria-hidden="true" />
                          <span
                            className={styles.positionPin}
                            style={{
                              '--map-x': `${draft.mapX}%`,
                              '--map-y': `${draft.mapY}%`,
                              '--node-color': draft.nodeThemeColor || '#8B1E2D',
                            } as CSSProperties}
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                      <label className={`${styles.field} ${styles.wideField}`}>
                        <span>핀 썸네일 URL</span>
                        <input
                          value={draft.nodeIconUrl}
                          onChange={(event) => updateDraft({ nodeIconUrl: event.target.value })}
                          placeholder="https://..."
                        />
                        <span className={styles.uploadRow}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => void handleAssetUpload('pin', event)}
                          />
                          <span>{uploadingKey === `${draft.id}:pin` ? '업로드 중' : '핀 이미지 업로드'}</span>
                        </span>
                      </label>
                      <label className={`${styles.field} ${styles.wideField}`}>
                        <span>카드 썸네일 URL</span>
                        <input
                          value={draft.thumbnailUrl}
                          onChange={(event) => updateDraft({ thumbnailUrl: event.target.value })}
                          placeholder="https://..."
                        />
                        <span className={styles.uploadRow}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => void handleAssetUpload('card', event)}
                          />
                          <span>{uploadingKey === `${draft.id}:card` ? '업로드 중' : '카드 이미지 업로드'}</span>
                        </span>
                      </label>
                    </div>

                    <div className={styles.actionRow}>
                      <span className={styles.statusText}>
                        {isDirty ? '저장하지 않은 변경 사항이 있습니다.' : '저장된 상태입니다.'}
                      </span>
                      <button
                        type="button"
                        className={styles.saveButton}
                        disabled={!isDirty || isSaving}
                        onClick={() => void handleSave()}
                      >
                        {isSaving ? '저장 중' : '저장'}
                      </button>
                    </div>
                  </section>
                ) : null}

                {activeTab === 'maze' && isMazeContent ? <AdminMazeManager /> : null}
              </>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
