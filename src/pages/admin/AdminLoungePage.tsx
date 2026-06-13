import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type PointerEvent } from 'react';

import {
  getAdminLoungeSettings,
  getAdminLoungeNodes,
  updateAdminLoungeSettings,
  updateAdminLoungeNode,
  uploadLoungeMapBackground,
  uploadLoungeNodeAsset,
  type LoungeAssetKind,
  type AdminLoungeNodeUpdateInput,
} from '../../features/lounge/lounge.admin.api';
import type { LoungeNode, LoungeSettings } from '../../features/lounge/types/lounge.types';
import { AdminHeader } from '../../shared/components/layout/AdminHeader';
import { Footer } from '../../shared/components/layout/Footer';
import { colors } from '../../shared/styles/tokens/colors';
import styles from './AdminLoungePage.module.css';

type PageStatus = 'loading' | 'ready' | 'error';
type NodeFilter = 'all' | 'enabled' | 'disabled';
type NodeDraft = AdminLoungeNodeUpdateInput;
type SettingsDraft = Pick<LoungeSettings, 'mapBackgroundUrl' | 'mapBackgroundMode'>;
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

export function AdminLoungePage() {
  const [nodes, setNodes] = useState<LoungeNode[]>([]);
  const [drafts, setDrafts] = useState<Record<string, NodeDraft>>({});
  const [settings, setSettings] = useState<LoungeSettings | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>({
    mapBackgroundUrl: '',
    mapBackgroundMode: 'css',
  });
  const [status, setStatus] = useState<PageStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [savingId, setSavingId] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [uploadingKey, setUploadingKey] = useState('');
  const [searchText, setSearchText] = useState('');
  const [nodeFilter, setNodeFilter] = useState<NodeFilter>('all');

  useEffect(() => {
    let isMounted = true;

    async function loadNodes() {
      try {
        setStatus('loading');
        const [nextNodes, nextSettings] = await Promise.all([
          getAdminLoungeNodes(),
          getAdminLoungeSettings(),
        ]);

        if (isMounted) {
          setNodes(nextNodes);
          setDrafts(Object.fromEntries(nextNodes.map((node) => [node.id, toDraft(node)])));
          setSettings(nextSettings);
          setSettingsDraft({
            mapBackgroundUrl: nextSettings?.mapBackgroundUrl ?? '',
            mapBackgroundMode: nextSettings?.mapBackgroundMode ?? 'css',
          });
          setStatus('ready');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : '라운지 노드를 불러오지 못했습니다.');
          setStatus('error');
        }
      }
    }

    void loadNodes();

    return () => {
      isMounted = false;
    };
  }, []);

  const enabledCount = useMemo(
    () => Object.values(drafts).filter((draft) => draft.isEnabled).length,
    [drafts],
  );

  const filteredNodes = useMemo(() => {
    const normalizedSearchText = searchText.trim().toLowerCase();

    return nodes.filter((node) => {
      const draft = drafts[node.id] ?? toDraft(node);
      const matchesFilter =
        nodeFilter === 'all'
        || (nodeFilter === 'enabled' && draft.isEnabled)
        || (nodeFilter === 'disabled' && !draft.isEnabled);
      const matchesSearch =
        !normalizedSearchText
        || [
          node.content.title,
          node.content.slug,
          node.nodeLabel ?? '',
          draft.nodeLabel,
          typeLabelMap[node.content.contentType],
        ].some((value) => value.toLowerCase().includes(normalizedSearchText));

      return matchesFilter && matchesSearch;
    });
  }, [drafts, nodeFilter, nodes, searchText]);
  const isSettingsDirty = JSON.stringify(settingsDraft) !== JSON.stringify({
    mapBackgroundUrl: settings?.mapBackgroundUrl ?? '',
    mapBackgroundMode: settings?.mapBackgroundMode ?? 'css',
  });
  const hasDraftMapBackgroundImage = Boolean(
    settingsDraft.mapBackgroundMode === 'image' && settingsDraft.mapBackgroundUrl,
  );
  const positionEditorStyle: PositionEditorStyle = hasDraftMapBackgroundImage
    ? {
        '--admin-position-map-image': `url("${settingsDraft.mapBackgroundUrl}")`,
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

  function updateDraft(nodeId: string, partialDraft: Partial<NodeDraft>) {
    setDrafts((currentDrafts) => {
      const currentDraft = currentDrafts[nodeId];

      if (!currentDraft) {
        return currentDrafts;
      }

      return {
        ...currentDrafts,
        [nodeId]: {
          ...currentDraft,
          ...partialDraft,
        },
      };
    });
  }

  function updateDraftPosition(nodeId: string, event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextMapX = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const nextMapY = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));

    event.currentTarget.setPointerCapture(event.pointerId);
    updateDraft(nodeId, {
      mapX: Number(nextMapX.toFixed(1)),
      mapY: Number(nextMapY.toFixed(1)),
    });
  }

  async function handleAssetUpload(nodeId: string, kind: LoungeAssetKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      const key = `${nodeId}:${kind}`;
      setUploadingKey(key);
      setErrorMessage('');
      const assetUrl = await uploadLoungeNodeAsset(nodeId, kind, file);

      updateDraft(nodeId, kind === 'pin'
        ? { nodeIconUrl: assetUrl }
        : { thumbnailUrl: assetUrl });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '이미지를 업로드하지 못했습니다.');
    } finally {
      setUploadingKey('');
    }
  }

  async function handleMapBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setUploadingKey('map-background');
      setErrorMessage('');
      const assetUrl = await uploadLoungeMapBackground(file);

      setSettingsDraft({
        mapBackgroundUrl: assetUrl,
        mapBackgroundMode: 'image',
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '지도 배경 이미지를 업로드하지 못했습니다.');
    } finally {
      setUploadingKey('');
    }
  }

  async function handleSaveSettings() {
    try {
      setIsSavingSettings(true);
      setErrorMessage('');
      const nextSettings = await updateAdminLoungeSettings(settingsDraft);

      setSettings(nextSettings);
      setSettingsDraft({
        mapBackgroundUrl: nextSettings.mapBackgroundUrl ?? '',
        mapBackgroundMode: nextSettings.mapBackgroundMode,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '라운지 배경 설정을 저장하지 못했습니다.');
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleSave(node: LoungeNode) {
    const draft = drafts[node.id];

    if (!draft) {
      return;
    }

    try {
      setSavingId(node.id);
      setErrorMessage('');
      const updatedNode = await updateAdminLoungeNode(draft);

      if (updatedNode) {
        setNodes((currentNodes) => currentNodes.map((currentNode) => (
          currentNode.id === updatedNode.id ? updatedNode : currentNode
        )));
        setDrafts((currentDrafts) => ({
          ...currentDrafts,
          [updatedNode.id]: toDraft(updatedNode),
        }));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '라운지 노드를 저장하지 못했습니다.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text)]">
      <AdminHeader />
      <main>
        <section className={styles.page} style={pageStyle}>
          <div className={styles.inner}>
            <div className={styles.titleRow}>
              <div>
                <h1 className={styles.title}>라운지 관리</h1>
                <p className={styles.description}>
                  라운지 메인 지도와 목록에 표시되는 노드의 활성 여부, 색상, 썸네일을 관리합니다.
                </p>
              </div>
              <span className={styles.countBadge}>활성 {enabledCount}개</span>
            </div>

            <div className={styles.toolbar}>
              <input
                className={styles.searchInput}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="콘텐츠명, slug, 노드명 검색"
                aria-label="라운지 노드 검색"
              />
              <div className={styles.filterGroup} aria-label="라운지 노드 필터">
                <button
                  type="button"
                  className={`${styles.filterButton} ${nodeFilter === 'all' ? styles.filterButtonActive : ''}`}
                  aria-pressed={nodeFilter === 'all'}
                  onClick={() => setNodeFilter('all')}
                >
                  전체
                </button>
                <button
                  type="button"
                  className={`${styles.filterButton} ${nodeFilter === 'enabled' ? styles.filterButtonActive : ''}`}
                  aria-pressed={nodeFilter === 'enabled'}
                  onClick={() => setNodeFilter('enabled')}
                >
                  활성
                </button>
                <button
                  type="button"
                  className={`${styles.filterButton} ${nodeFilter === 'disabled' ? styles.filterButtonActive : ''}`}
                  aria-pressed={nodeFilter === 'disabled'}
                  onClick={() => setNodeFilter('disabled')}
                >
                  비활성
                </button>
              </div>
            </div>

            {status === 'loading' ? (
              <p className={styles.message}>라운지 노드를 불러오는 중입니다.</p>
            ) : null}

            {status === 'error' || errorMessage ? (
              <p className={styles.errorMessage} role="alert">{errorMessage}</p>
            ) : null}

            {status === 'ready' && nodes.length === 0 ? (
              <p className={styles.message}>등록된 라운지 노드가 없습니다.</p>
            ) : null}

            {status === 'ready' ? (
              <section className={styles.settingsPanel} aria-labelledby="lounge-map-settings-title">
                <div className={styles.settingsHeader}>
                  <div>
                    <h2 id="lounge-map-settings-title" className={styles.sectionTitle}>
                      지도 배경
                    </h2>
                    <p className={styles.sectionDescription}>
                      업로드한 이미지를 라운지 지도 배경으로 사용하거나 기본 CSS 지도로 되돌릴 수 있습니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.saveButton}
                    disabled={!isSettingsDirty || isSavingSettings}
                    onClick={() => void handleSaveSettings()}
                  >
                    {isSavingSettings ? '저장 중' : '설정 저장'}
                  </button>
                </div>

                <div className={styles.settingsGrid}>
                  <div className={styles.mapBackgroundPreview}>
                    {settingsDraft.mapBackgroundMode === 'image' && settingsDraft.mapBackgroundUrl ? (
                      <img src={settingsDraft.mapBackgroundUrl} alt="" aria-hidden="true" />
                    ) : (
                      <span>CSS 지도</span>
                    )}
                  </div>
                  <div className={styles.settingsFields}>
                    <div className={styles.modeGroup} aria-label="지도 배경 방식">
                      <button
                        type="button"
                        className={`${styles.filterButton} ${settingsDraft.mapBackgroundMode === 'css' ? styles.filterButtonActive : ''}`}
                        aria-pressed={settingsDraft.mapBackgroundMode === 'css'}
                        onClick={() => setSettingsDraft((currentDraft) => ({
                          ...currentDraft,
                          mapBackgroundMode: 'css',
                        }))}
                      >
                        기본 지도
                      </button>
                      <button
                        type="button"
                        className={`${styles.filterButton} ${settingsDraft.mapBackgroundMode === 'image' ? styles.filterButtonActive : ''}`}
                        aria-pressed={settingsDraft.mapBackgroundMode === 'image'}
                        onClick={() => setSettingsDraft((currentDraft) => ({
                          ...currentDraft,
                          mapBackgroundMode: 'image',
                        }))}
                      >
                        이미지 사용
                      </button>
                    </div>
                    <label className={styles.field}>
                      <span>배경 이미지 URL</span>
                      <input
                        value={settingsDraft.mapBackgroundUrl ?? ''}
                        onChange={(event) => setSettingsDraft((currentDraft) => ({
                          ...currentDraft,
                          mapBackgroundUrl: event.target.value,
                          mapBackgroundMode: event.target.value.trim() ? 'image' : currentDraft.mapBackgroundMode,
                        }))}
                        placeholder="https://..."
                      />
                    </label>
                    <span className={styles.uploadRow}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => void handleMapBackgroundUpload(event)}
                      />
                      <span>{uploadingKey === 'map-background' ? '업로드 중' : '지도 배경 이미지 업로드'}</span>
                    </span>
                  </div>
                </div>
              </section>
            ) : null}

            {status === 'ready' && nodes.length > 0 && filteredNodes.length === 0 ? (
              <p className={styles.message}>조건에 맞는 라운지 노드가 없습니다.</p>
            ) : null}

            {status === 'ready' && filteredNodes.length > 0 ? (
              <div className={styles.nodeList}>
                {filteredNodes.map((node) => {
                  const draft = drafts[node.id] ?? toDraft(node);
                  const originalDraft = toDraft(node);
                  const isDirty = !isSameDraft(draft, originalDraft);
                  const isSaving = savingId === node.id;

                  return (
                    <section key={node.id} className={styles.nodePanel}>
                      <div className={styles.nodeSummary}>
                        <span
                          className={styles.nodePreview}
                          style={{ '--node-color': draft.nodeThemeColor || '#8B1E2D' } as CSSProperties}
                          aria-hidden="true"
                        >
                          {draft.nodeIconUrl || draft.thumbnailUrl ? (
                            <img src={draft.nodeIconUrl || draft.thumbnailUrl} alt="" />
                          ) : (
                            <span>{node.content.title.slice(0, 1)}</span>
                          )}
                        </span>
                        <div className={styles.nodeText}>
                          <strong>{node.content.title}</strong>
                          <span>{typeLabelMap[node.content.contentType]} · {node.content.slug}</span>
                        </div>
                        <label className={styles.toggleLabel}>
                          <input
                            type="checkbox"
                            checked={draft.isEnabled}
                            onChange={(event) => updateDraft(node.id, { isEnabled: event.target.checked })}
                          />
                          <span>활성</span>
                        </label>
                      </div>

                      <div className={styles.formGrid}>
                        <label className={styles.field}>
                          <span>노드 라벨</span>
                          <input
                            value={draft.nodeLabel}
                            onChange={(event) => updateDraft(node.id, { nodeLabel: event.target.value })}
                            placeholder={node.content.title}
                          />
                        </label>
                        <label className={styles.field}>
                          <span>테마 키</span>
                          <input
                            value={draft.nodeVariant}
                            onChange={(event) => updateDraft(node.id, { nodeVariant: event.target.value })}
                            placeholder="quiz"
                          />
                        </label>
                        <label className={styles.field}>
                          <span>대표 컬러</span>
                          <span className={styles.colorField}>
                            <input
                              type="color"
                              value={draft.nodeThemeColor || '#8B1E2D'}
                              onChange={(event) => updateDraft(node.id, { nodeThemeColor: event.target.value })}
                            />
                            <input
                              value={draft.nodeThemeColor}
                              onChange={(event) => updateDraft(node.id, { nodeThemeColor: event.target.value })}
                              placeholder="#8B1E2D"
                            />
                          </span>
                        </label>
                        <label className={styles.field}>
                          <span>정렬 순서</span>
                          <input
                            type="number"
                            value={draft.sortOrder}
                            onChange={(event) => updateDraft(node.id, { sortOrder: Number(event.target.value) })}
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
                            onChange={(event) => updateDraft(node.id, { mapX: Number(event.target.value) })}
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
                            onChange={(event) => updateDraft(node.id, { mapY: Number(event.target.value) })}
                          />
                        </label>
                        <div className={`${styles.field} ${styles.positionField}`}>
                          <span>지도 위치 미리보기</span>
                          <div
                            className={`${styles.positionEditor} ${
                              hasDraftMapBackgroundImage ? styles.positionEditorWithImage : ''
                            }`}
                            style={positionEditorStyle}
                            role="slider"
                            aria-label={`${node.content.title} 지도 위치`}
                            aria-valuetext={`X ${draft.mapX}, Y ${draft.mapY}`}
                            tabIndex={0}
                            onPointerDown={(event) => updateDraftPosition(node.id, event)}
                            onPointerMove={(event) => {
                              if (event.buttons === 1) {
                                updateDraftPosition(node.id, event);
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
                            onChange={(event) => updateDraft(node.id, { nodeIconUrl: event.target.value })}
                            placeholder="https://..."
                          />
                          <span className={styles.uploadRow}>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => void handleAssetUpload(node.id, 'pin', event)}
                            />
                            <span>{uploadingKey === `${node.id}:pin` ? '업로드 중' : '핀 이미지 업로드'}</span>
                          </span>
                        </label>
                        <label className={`${styles.field} ${styles.wideField}`}>
                          <span>카드 썸네일 URL</span>
                          <input
                            value={draft.thumbnailUrl}
                            onChange={(event) => updateDraft(node.id, { thumbnailUrl: event.target.value })}
                            placeholder="https://..."
                          />
                          <span className={styles.uploadRow}>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => void handleAssetUpload(node.id, 'card', event)}
                            />
                            <span>{uploadingKey === `${node.id}:card` ? '업로드 중' : '카드 이미지 업로드'}</span>
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
                          onClick={() => void handleSave(node)}
                        >
                          {isSaving ? '저장 중' : '저장'}
                        </button>
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
