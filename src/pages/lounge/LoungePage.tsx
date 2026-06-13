import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { getLoungeNodes, getLoungeSettings, recordLoungeActivity } from '../../features/lounge/lounge.api';
import type { LoungeNode, LoungeSettings, LoungeViewMode } from '../../features/lounge/types/lounge.types';
import { getSession } from '../../shared/api/supabaseRest';
import { PageShell } from '../../shared/components/layout/PageShell';
import { Popup, type PopupAction } from '../../shared/components/popup';
import { ROUTES } from '../../shared/constants/routes';
import styles from './LoungePage.module.css';

type PageStatus = 'loading' | 'ready' | 'error';
type NoticeType = 'member' | 'comingSoon' | 'eventLocked' | null;

type NodeStyle = CSSProperties & {
  '--node-x': string;
  '--node-y': string;
  '--node-color': string;
};

type MapCanvasStyle = CSSProperties & {
  '--lounge-map-background-image'?: string;
};

const anonymousStorageKey = 'bangchelin.lounge.anonymousId';

const typeLabelMap = {
  game: '게임',
  quiz: '퀴즈',
  event: '이벤트',
  tool: '도구',
} as const;

function getAnonymousId() {
  const storedId = window.localStorage.getItem(anonymousStorageKey);

  if (storedId) {
    return storedId;
  }

  const nextId = crypto.randomUUID();
  window.localStorage.setItem(anonymousStorageKey, nextId);
  return nextId;
}

function getNodeInitial(node: LoungeNode) {
  return node.nodeLabel?.slice(0, 1) ?? node.content.title.slice(0, 1);
}

function getNodeThumbnail(node: LoungeNode) {
  return node.nodeIconUrl || node.content.thumbnailUrl;
}

function canDisplayInMode(node: LoungeNode, viewMode: LoungeViewMode) {
  return node.displayMode === 'both' || node.displayMode === viewMode;
}

function getEventOpenTime(node: LoungeNode) {
  const opensAt = node.content.eventConfig?.opensAt ?? null;

  return opensAt ? new Date(opensAt).getTime() : null;
}

function isEventLocked(node: LoungeNode, now: number) {
  const openTime = getEventOpenTime(node);

  return openTime !== null && openTime > now;
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}일 ${hours.toString().padStart(2, '0')}시간`;
  }

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
}

function getNodeStatusLabel(node: LoungeNode, now: number) {
  if (!node.isEnabled) {
    return '준비 중';
  }

  if (isEventLocked(node, now)) {
    const openTime = getEventOpenTime(node) ?? now;
    return `오픈까지 ${formatCountdown(openTime - now)}`;
  }

  return typeLabelMap[node.content.contentType];
}

export function LoungePage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<LoungeViewMode>('map');
  const [nodes, setNodes] = useState<LoungeNode[]>([]);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [settings, setSettings] = useState<LoungeSettings | null>(null);
  const [noticeType, setNoticeType] = useState<NoticeType>(null);
  const [selectedNode, setSelectedNode] = useState<LoungeNode | null>(null);
  const [now, setNow] = useState(Date.now());
  const anonymousId = useMemo(getAnonymousId, []);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadNodes() {
      try {
        setStatus('loading');
        const [nextNodes, nextSettings] = await Promise.all([
          getLoungeNodes(),
          getLoungeSettings(),
        ]);

        if (isMounted) {
          setNodes(nextNodes);
          setSettings(nextSettings);
          setStatus('ready');
        }
      } catch {
        if (isMounted) {
          setStatus('error');
        }
      }
    }

    void loadNodes();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleNodes = useMemo(
    () => nodes.filter((node) => canDisplayInMode(node, viewMode)),
    [nodes, viewMode],
  );
  const hasMapBackgroundImage = Boolean(
    settings?.mapBackgroundMode === 'image' && settings.mapBackgroundUrl,
  );
  const mapCanvasStyle: MapCanvasStyle = hasMapBackgroundImage
    ? {
        '--lounge-map-background-image': `url("${settings?.mapBackgroundUrl}")`,
      }
    : {};

  function handleViewModeChange(nextViewMode: LoungeViewMode) {
    setViewMode(nextViewMode);
    void recordLoungeActivity({
      anonymousId,
      eventType: 'view_mode_change',
      eventPayload: {
        viewMode: nextViewMode,
      },
    });
  }

  function openNotice(type: NoticeType, node: LoungeNode) {
    setSelectedNode(node);
    setNoticeType(type);
  }

  function handleNodeClick(node: LoungeNode) {
    if (!node.isEnabled) {
      openNotice('comingSoon', node);
      void recordLoungeActivity({
        anonymousId,
        contentId: node.content.id,
        eventType: 'coming_soon_click',
        eventPayload: {
          slug: node.content.slug,
          viewMode,
        },
      });
      return;
    }

    if (node.content.accessLevel === 'member' && !getSession()) {
      openNotice('member', node);
      void recordLoungeActivity({
        anonymousId,
        contentId: node.content.id,
        eventType: 'locked_node_click',
        eventPayload: {
          slug: node.content.slug,
          viewMode,
        },
      });
      return;
    }

    if (isEventLocked(node, now)) {
      openNotice('eventLocked', node);
      void recordLoungeActivity({
        anonymousId,
        contentId: node.content.id,
        eventType: 'event_locked_click',
        eventPayload: {
          slug: node.content.slug,
          opensAt: node.content.eventConfig?.opensAt,
          viewMode,
        },
      });
      return;
    }

    void recordLoungeActivity({
      anonymousId,
      contentId: node.content.id,
      eventType: 'node_click',
      eventPayload: {
        slug: node.content.slug,
        viewMode,
      },
    });
    navigate(node.content.eventConfig?.targetRoutePath ?? node.content.routePath);
  }

  const noticeActions: PopupAction[] = noticeType === 'member'
    ? [
        {
          label: '로그인하기',
          variant: 'filled',
          onClick: () => {
            const redirectTo = selectedNode?.content.routePath ?? ROUTES.lounge;
            navigate(`${ROUTES.login}?redirectTo=${encodeURIComponent(redirectTo)}`);
          },
        },
        {
          label: '닫기',
          variant: 'outline',
          tone: 'neutral',
          onClick: () => setNoticeType(null),
        },
      ]
    : [
        {
          label: '확인',
          variant: 'filled',
          onClick: () => setNoticeType(null),
        },
      ];

  const eventOpenTime = selectedNode ? getEventOpenTime(selectedNode) : null;
  const noticeTitle = noticeType === 'member'
    ? '로그인이 필요합니다'
    : noticeType === 'eventLocked'
      ? '아직 오픈 전 이벤트입니다'
      : '준비 중인 콘텐츠입니다';
  const noticeDescription = noticeType === 'member'
    ? '이 콘텐츠는 로그인 후 이용할 수 있습니다.'
    : noticeType === 'eventLocked' && eventOpenTime
      ? `${selectedNode?.content.title ?? '선택한 이벤트'}는 ${new Date(eventOpenTime).toLocaleString('ko-KR')}에 오픈됩니다.`
      : `${selectedNode?.content.title ?? '선택한 콘텐츠'}는 아직 시작 전입니다. 라운지 메인에서 위치와 이름을 확인해주세요.`;

  return (
    <PageShell>
      <div className={styles.page}>
        <section className={styles.hero} aria-labelledby="lounge-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>BANGCHELIN LOUNGE</p>
            <h1 id="lounge-title" className={styles.title}>라운지</h1>
            <p className={styles.description}>
              게임, 퀴즈, 이벤트를 지도와 목록에서 탐색하는 인터랙티브 콘텐츠 허브입니다.
            </p>
          </div>

          <div className={styles.toolbar} aria-label="라운지 보기 방식">
            <button
              type="button"
              className={`${styles.viewButton} ${viewMode === 'map' ? styles.viewButtonActive : ''}`}
              aria-pressed={viewMode === 'map'}
              onClick={() => handleViewModeChange('map')}
            >
              지도
            </button>
            <button
              type="button"
              className={`${styles.viewButton} ${viewMode === 'store' ? styles.viewButtonActive : ''}`}
              aria-pressed={viewMode === 'store'}
              onClick={() => handleViewModeChange('store')}
            >
              목록
            </button>
          </div>
        </section>

        {status === 'loading' ? (
          <section className={styles.statePanel} aria-live="polite">
            라운지를 불러오는 중입니다.
          </section>
        ) : null}

        {status === 'error' ? (
          <section className={styles.statePanel} role="alert">
            라운지를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </section>
        ) : null}

        {status === 'ready' && visibleNodes.length === 0 ? (
          <section className={styles.statePanel}>
            현재 표시할 라운지 콘텐츠가 없습니다.
          </section>
        ) : null}

        {status === 'ready' && visibleNodes.length > 0 ? (
          viewMode === 'map' ? (
            <section className={styles.mapSection} aria-label="라운지 지도">
              <div
                className={`${styles.mapCanvas} ${hasMapBackgroundImage ? styles.mapCanvasWithImage : ''}`}
                style={mapCanvasStyle}
              >
                <div className={styles.skyLayer} aria-hidden="true" />
                <div className={styles.landLayer} aria-hidden="true">
                  <span className={`${styles.landMass} ${styles.landMassNorth}`} />
                  <span className={`${styles.landMass} ${styles.landMassWest}`} />
                  <span className={`${styles.landMass} ${styles.landMassSouth}`} />
                  <span className={`${styles.landMass} ${styles.landMassEast}`} />
                  <span className={styles.centerLake} />
                  <span className={styles.routeLine} />
                </div>

                {visibleNodes.map((node) => {
                  const nodeStyle: NodeStyle = {
                    '--node-x': `${node.mapX}%`,
                    '--node-y': `${node.mapY}%`,
                    '--node-color': node.nodeThemeColor || '#8B1E2D',
                  };
                  const thumbnailUrl = getNodeThumbnail(node);

                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={`${styles.mapNode} ${styles[`nodeVariant${node.nodeVariant}`] ?? ''} ${
                        !node.isEnabled ? styles.mapNodeDisabled : ''
                      }`}
                      style={nodeStyle}
                      onClick={() => handleNodeClick(node)}
                    >
                      <span className={styles.nodeMarker}>
                        <span className={styles.nodePinHead}>
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt="" className={styles.nodeIcon} aria-hidden="true" />
                          ) : (
                            <span aria-hidden="true">{getNodeInitial(node)}</span>
                          )}
                        </span>
                        <span className={styles.nodePinTail} aria-hidden="true" />
                        <span className={styles.nodeShadow} aria-hidden="true" />
                      </span>
                      <span className={styles.nodeText}>
                        <strong>{node.nodeLabel ?? node.content.title}</strong>
                        <span>{getNodeStatusLabel(node, now)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className={styles.storeSection} aria-label="라운지 콘텐츠 목록">
              <div className={styles.storeGrid}>
                {visibleNodes.map((node) => {
                  const thumbnailUrl = getNodeThumbnail(node);

                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={styles.storeCard}
                      onClick={() => handleNodeClick(node)}
                    >
                      <span
                        className={`${styles.cardMedia} ${styles[`cardVariant${node.nodeVariant}`] ?? ''}`}
                        style={{ '--node-color': node.nodeThemeColor || '#8B1E2D' } as CSSProperties}
                      >
                        {thumbnailUrl ? (
                          <img src={thumbnailUrl} alt="" className={styles.cardImage} aria-hidden="true" />
                        ) : (
                          <span>{getNodeInitial(node)}</span>
                        )}
                      </span>
                      <span className={styles.cardBody}>
                        <span className={styles.cardMeta}>
                          {typeLabelMap[node.content.contentType]} · {getNodeStatusLabel(node, now)}
                        </span>
                        <strong className={styles.cardTitle}>{node.content.title}</strong>
                        <span className={styles.cardSummary}>{node.content.summary}</span>
                        <span className={styles.tagRow}>
                          {node.content.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className={styles.tag}>{tag}</span>
                          ))}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )
        ) : null}
      </div>

      <Popup
        open={Boolean(noticeType)}
        onClose={() => setNoticeType(null)}
        title={noticeTitle}
        description={noticeDescription}
        actions={noticeActions}
        maxWidth={380}
      />
    </PageShell>
  );
}
