import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getMinigameRanking } from '../../features/minigame/minigame.api';
import type { MinigameRankingEntry } from '../../features/minigame/minigame.types';
import { installUnityWebGLBridge } from '../../features/minigame/unityWebGLBridge';
import { PageShell } from '../../shared/components/layout/PageShell';
import { Popup, type PopupAction } from '../../shared/components/popup';
import { ROUTES } from '../../shared/constants/routes';
import { isMobileDevice } from '../../shared/lib/device';
import styles from './DdeokGamePage.module.css';

type UnityInstance = {
  SendMessage(gameObjectName: string, methodName: string, payload: string): void;
  SetFullscreen(fullscreen: number): void;
  Quit(): Promise<void>;
};

type UnityConfig = {
  dataUrl: string;
  frameworkUrl: string;
  codeUrl: string;
  streamingAssetsUrl: string;
  companyName: string;
  productName: string;
  productVersion: string;
  showBanner(message: string, type: string): void;
};

type QueuedMessage = Parameters<UnityInstance['SendMessage']>;

declare global {
  interface Window {
    createUnityInstance?: (
      canvas: HTMLCanvasElement,
      config: UnityConfig,
      onProgress: (progress: number) => void,
    ) => Promise<UnityInstance>;
  }
}

const unityRoot = `${import.meta.env.BASE_URL}unity/bangchelin-ddeok`;
const loaderUrl = `${unityRoot}/Build/WebGL.loader.js`;
const loaderScriptId = 'bangchelin-ddeok-unity-loader';
const gameSlug = 'bangchelin-ddeok';
let unityInitializationQueue = Promise.resolve();

function loadUnityLoader() {
  if (window.createUnityInstance) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(loaderScriptId) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement('script');

    function cleanup() {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    }

    function handleLoad() {
      cleanup();
      if (window.createUnityInstance) {
        resolve();
      } else {
        reject(new Error('Unity 로더를 초기화하지 못했습니다.'));
      }
    }

    function handleError() {
      cleanup();
      script.remove();
      reject(new Error('Unity WebGL 로더 파일을 불러오지 못했습니다.'));
    }

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    if (!existingScript) {
      script.id = loaderScriptId;
      script.src = loaderUrl;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

export function DdeokGamePage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<UnityInstance | null>(null);
  const [isMobileRestricted] = useState(isMobileDevice);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [warning, setWarning] = useState('');
  const [rankingOpen, setRankingOpen] = useState(false);
  const [rankingStatus, setRankingStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [rankingEntries, setRankingEntries] = useState<MinigameRankingEntry[]>([]);
  const [rankingError, setRankingError] = useState('');

  useEffect(() => {
    if (isMobileRestricted) {
      return;
    }

    const canvasElement = canvasRef.current;

    if (!canvasElement) {
      return;
    }
    const unityCanvas: HTMLCanvasElement = canvasElement;

    let disposed = false;
    const queuedMessages: QueuedMessage[] = [];
    const bridgeTarget = {
      SendMessage(...message: QueuedMessage) {
        const instance = instanceRef.current;

        if (instance) {
          instance.SendMessage(...message);
        } else {
          queuedMessages.push(message);
        }
      },
    };

    // The game can request login data while its first scene is still starting.
    const removeBridge = installUnityWebGLBridge(bridgeTarget);

    async function initializeUnity() {
      try {
        if (disposed) {
          return;
        }

        setStatus('loading');
        setProgress(0);
        setErrorMessage('');
        await loadUnityLoader();

        if (disposed || !window.createUnityInstance) {
          return;
        }

        const instance = await window.createUnityInstance(
          unityCanvas,
          {
            dataUrl: `${unityRoot}/Build/WebGL.data`,
            frameworkUrl: `${unityRoot}/Build/WebGL.framework.js`,
            codeUrl: `${unityRoot}/Build/WebGL.wasm`,
            streamingAssetsUrl: `${unityRoot}/StreamingAssets`,
            companyName: 'DefaultCompany',
            productName: 'Boreumdal Hapchigi',
            productVersion: '1.0',
            showBanner(message, type) {
              if (disposed) {
                return;
              }

              setWarning(message);
              if (type !== 'error') {
                window.setTimeout(() => {
                  if (!disposed) {
                    setWarning('');
                  }
                }, 5000);
              }
            },
          },
          (nextProgress) => {
            if (!disposed) {
              setProgress(nextProgress);
            }
          },
        );

        if (disposed) {
          await instance.Quit();
          return;
        }

        instanceRef.current = instance;
        queuedMessages.splice(0).forEach((message) => instance.SendMessage(...message));
        setStatus('ready');
      } catch (error) {
        if (!disposed) {
          setErrorMessage(error instanceof Error ? error.message : '게임을 실행하지 못했습니다.');
          setStatus('error');
        }
      }
    }

    // React StrictMode mounts effects twice in development. Serializing startup keeps
    // two Unity runtimes from trying to own the same canvas simultaneously.
    const queuedInitialization = unityInitializationQueue.then(initializeUnity, initializeUnity);
    unityInitializationQueue = queuedInitialization.then(() => undefined, () => undefined);

    return () => {
      disposed = true;
      removeBridge();
      queuedMessages.length = 0;
      const instance = instanceRef.current;
      instanceRef.current = null;

      if (instance) {
        void instance.Quit().catch(() => undefined);
      }
    };
  }, [isMobileRestricted]);

  async function loadRanking() {
    setRankingStatus('loading');
    setRankingError('');

    try {
      const entries = await getMinigameRanking(gameSlug, 100, 0);
      setRankingEntries(entries);
      setRankingStatus('ready');
    } catch (error) {
      setRankingError(error instanceof Error ? error.message : '랭킹을 불러오지 못했습니다.');
      setRankingStatus('error');
    }
  }

  function handleRankingOpen() {
    setRankingOpen(true);
    void loadRanking();
  }

  const mobileNoticeActions: PopupAction[] = [
    {
      label: '라운지로 이동',
      variant: 'filled',
      onClick: () => navigate(ROUTES.lounge, { replace: true }),
    },
  ];

  return (
    <PageShell>
      <div className={styles.page}>
        <section className={styles.header} aria-labelledby="ddeok-game-title">
          <div>
            <p className={styles.eyebrow}>BANGCHELIN MINI GAME</p>
            <h1 id="ddeok-game-title" className={styles.title}>보름달 합치기</h1>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.rankingButton} onClick={handleRankingOpen}>
              랭킹 확인
            </button>
            <button
              type="button"
              className={styles.fullscreenButton}
              disabled={status !== 'ready'}
              onClick={() => instanceRef.current?.SetFullscreen(1)}
            >
              전체 화면
            </button>
          </div>
        </section>

        <section className={styles.gameFrame} aria-label="보름달 합치기 게임">
          <canvas
            id="unity-canvas"
            ref={canvasRef}
            className={styles.canvas}
            width={960}
            height={600}
            tabIndex={-1}
          />

          {status === 'loading' ? (
            <div className={styles.loadingPanel} aria-live="polite">
              <strong>게임을 불러오는 중입니다.</strong>
              <div className={styles.progressTrack} aria-hidden="true">
                <span className={styles.progressBar} style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <span>{Math.round(progress * 100)}%</span>
            </div>
          ) : null}

          {status === 'error' ? (
            <div className={styles.errorPanel} role="alert">
              <strong>게임을 실행하지 못했습니다.</strong>
              <span>{errorMessage}</span>
              <button type="button" onClick={() => window.location.reload()}>다시 시도</button>
            </div>
          ) : null}

          {warning ? <div className={styles.warning} role="alert">{warning}</div> : null}
        </section>

        <p className={styles.guide}>게임 기록은 로그인한 계정에 자동으로 저장됩니다.</p>
      </div>

      <Popup
        open={rankingOpen}
        onClose={() => setRankingOpen(false)}
        title="보름달 합치기 랭킹"
        description="계정별 최고 점수를 기준으로 집계한 순위입니다."
        maxWidth={560}
        hideCloseButton={false}
        actions={[{ label: '닫기', variant: 'outline', onClick: () => setRankingOpen(false) }]}
      >
        {rankingStatus === 'loading' ? (
          <div className={styles.rankingState} aria-live="polite">랭킹을 불러오는 중입니다.</div>
        ) : null}

        {rankingStatus === 'error' ? (
          <div className={styles.rankingState} role="alert">
            <span>{rankingError}</span>
            <button type="button" className={styles.retryButton} onClick={() => void loadRanking()}>다시 시도</button>
          </div>
        ) : null}

        {rankingStatus === 'ready' && rankingEntries.length === 0 ? (
          <div className={styles.rankingState}>아직 등록된 기록이 없습니다.</div>
        ) : null}

        {rankingStatus === 'ready' && rankingEntries.length > 0 ? (
          <div className={styles.rankingTableWrap}>
            <table className={styles.rankingTable}>
              <thead>
                <tr>
                  <th scope="col">순위</th>
                  <th scope="col">닉네임</th>
                  <th scope="col">최고 점수</th>
                </tr>
              </thead>
              <tbody>
                {rankingEntries.map((entry) => (
                  <tr key={entry.userId} className={entry.isMe ? styles.myRanking : undefined}>
                    <td>{entry.ranking}위</td>
                    <td>{entry.nickname}{entry.isMe ? <span className={styles.meBadge}>나</span> : null}</td>
                    <td>{entry.score.toLocaleString('ko-KR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Popup>

      <Popup
        open={isMobileRestricted}
        onClose={() => navigate(ROUTES.lounge, { replace: true })}
        title="모바일에서는 이용할 수 없습니다"
        description="보름달 합치기는 PC 환경에서만 실행할 수 있습니다. 라운지로 이동합니다."
        actions={mobileNoticeActions}
        role="alertdialog"
        closeOnOverlayClick={false}
        closeOnEscape={false}
      />
    </PageShell>
  );
}
