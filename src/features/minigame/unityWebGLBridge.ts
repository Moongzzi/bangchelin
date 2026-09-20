import {
  getMyMinigameBest,
  getWebGLAuthPayload,
  submitMinigameScore,
} from './minigame.api';
import type { SubmitMinigameScoreInput } from './minigame.types';

type UnityInstance = {
  SendMessage(gameObjectName: string, methodName: string, payload: string): void;
};

type UnityBridgeResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string } };

export type BangchelinUnityBridge = {
  requestAuth(): Promise<void>;
  requestMyBest(gameSlug: string): Promise<void>;
  submitScore(inputJson: string): Promise<void>;
};

declare global {
  interface Window {
    BangchelinUnityBridge?: BangchelinUnityBridge;
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
}

export function installUnityWebGLBridge(
  unityInstance: UnityInstance,
  receiverObjectName = 'BangchelinBridge',
) {
  function send<T>(methodName: string, result: UnityBridgeResult<T>) {
    unityInstance.SendMessage(receiverObjectName, methodName, JSON.stringify(result));
  }

  const bridge: BangchelinUnityBridge = {
    async requestAuth() {
      try {
        send('OnAuthResult', { ok: true, data: await getWebGLAuthPayload() });
      } catch (error) {
        send('OnAuthResult', { ok: false, error: { message: errorMessage(error) } });
      }
    },

    async requestMyBest(gameSlug: string) {
      try {
        send('OnMyBestResult', { ok: true, data: await getMyMinigameBest(gameSlug) });
      } catch (error) {
        send('OnMyBestResult', { ok: false, error: { message: errorMessage(error) } });
      }
    },

    async submitScore(inputJson: string) {
      try {
        const input = JSON.parse(inputJson) as SubmitMinigameScoreInput;
        send('OnScoreSubmitResult', { ok: true, data: await submitMinigameScore(input) });
      } catch (error) {
        send('OnScoreSubmitResult', { ok: false, error: { message: errorMessage(error) } });
      }
    },
  };

  window.BangchelinUnityBridge = bridge;

  return () => {
    if (window.BangchelinUnityBridge === bridge) {
      delete window.BangchelinUnityBridge;
    }
  };
}
