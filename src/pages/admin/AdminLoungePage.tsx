import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import {
  getAdminLoungeSettings,
  getAdminLoungeNodes,
  updateAdminLoungeSettings,
  uploadLoungeMapBackground,
} from '../../features/lounge/lounge.admin.api';
import type { LoungeNode, LoungeSettings } from '../../features/lounge/types/lounge.types';
import { AdminHeader } from '../../shared/components/layout/AdminHeader';
import { Footer } from '../../shared/components/layout/Footer';
import { ROUTES } from '../../shared/constants/routes';
import { colors } from '../../shared/styles/tokens/colors';
import styles from './AdminLoungePage.module.css';

type PageStatus = 'loading' | 'ready' | 'error';
type NodeFilter = 'all' | 'enabled' | 'disabled';
type SettingsDraft = Pick<LoungeSettings, 'mapBackgroundUrl' | 'mapBackgroundMode'>;

const typeLabelMap = {
  game: '게임',
  quiz: '퀴즈',
  event: '이벤트',
  tool: '도구',
} as const;

function isLoginRequired(node: LoungeNode) {
  return node.content.accessLevel !== 'public';
}

function getNodeThumbnail(node: LoungeNode) {
  return node.nodeIconUrl || node.content.thumbnailUrl;
}

export function AdminLoungePage() {
  const [nodes, setNodes] = useState<LoungeNode[]>([]);
  const [settings, setSettings] = useState<LoungeSettings | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>({
    mapBackgroundUrl: '',
    mapBackgroundMode: 'css',
  });
  const [status, setStatus] = useState<PageStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
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
    () => nodes.filter((node) => node.isEnabled).length,
    [nodes],
  );

  const filteredNodes = useMemo(() => {
    const normalizedSearchText = searchText.trim().toLowerCase();

    return nodes.filter((node) => {
      const matchesFilter =
        nodeFilter === 'all'
        || (nodeFilter === 'enabled' && node.isEnabled)
        || (nodeFilter === 'disabled' && !node.isEnabled);
      const matchesSearch =
        !normalizedSearchText
        || [
          node.content.title,
          node.content.slug,
          node.nodeLabel ?? '',
          typeLabelMap[node.content.contentType],
        ].some((value) => value.toLowerCase().includes(normalizedSearchText));

      return matchesFilter && matchesSearch;
    });
  }, [nodeFilter, nodes, searchText]);

  const isSettingsDirty = JSON.stringify(settingsDraft) !== JSON.stringify({
    mapBackgroundUrl: settings?.mapBackgroundUrl ?? '',
    mapBackgroundMode: settings?.mapBackgroundMode ?? 'css',
  });

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
                  라운지 지도 배경과 콘텐츠 노드 목록을 관리합니다. 노드별 옵션은 각 콘텐츠 관리 화면에서 수정합니다.
                </p>
              </div>
              <span className={styles.countBadge}>활성 {enabledCount}개</span>
            </div>

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

            {status === 'ready' && nodes.length > 0 && filteredNodes.length === 0 ? (
              <p className={styles.message}>조건에 맞는 라운지 노드가 없습니다.</p>
            ) : null}

            {status === 'ready' && filteredNodes.length > 0 ? (
              <div className={styles.nodeList}>
                {filteredNodes.map((node) => {
                  const thumbnailUrl = getNodeThumbnail(node);

                  return (
                    <section key={node.id} className={styles.nodePanel}>
                      <div className={styles.nodeSummary}>
                        <span
                          className={styles.nodePreview}
                          style={{ '--node-color': node.nodeThemeColor || '#8B1E2D' } as CSSProperties}
                          aria-hidden="true"
                        >
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt="" />
                          ) : (
                            <span>{node.nodeLabel?.slice(0, 1) ?? node.content.title.slice(0, 1)}</span>
                          )}
                        </span>
                        <div className={styles.nodeText}>
                          <strong>{node.nodeLabel || node.content.title}</strong>
                          <span>
                            {typeLabelMap[node.content.contentType]} · {node.content.slug}
                          </span>
                        </div>
                        <div className={styles.badgeRow} aria-label="노드 상태">
                          <span className={`${styles.statusBadge} ${node.isEnabled ? styles.statusBadgeOn : ''}`}>
                            {node.isEnabled ? '활성' : '비활성'}
                          </span>
                          <span className={styles.statusBadge}>
                            {isLoginRequired(node) ? '로그인 필수' : '비로그인 제공'}
                          </span>
                        </div>
                        <Link
                          to={ROUTES.adminLoungeContent.replace(':nodeId', node.id)}
                          className={styles.manageLink}
                        >
                          관리
                        </Link>
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
