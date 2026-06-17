type KakaoDefaultFeedOptions = {
  objectType: 'feed';
  content: {
    title: string;
    description: string;
    imageUrl?: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  };
  buttons: Array<{
    title: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  }>;
};

type KakaoCustomOptions = {
  templateId: number;
  templateArgs?: Record<string, string>;
  serverCallbackArgs?: Record<string, string>;
};

type KakaoShareApi = {
  sendDefault: (options: KakaoDefaultFeedOptions) => void;
  sendCustom: (options: KakaoCustomOptions) => void;
};

type KakaoSdk = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share?: KakaoShareApi;
};

const kakaoSdkScriptId = 'kakao-javascript-sdk';
const kakaoSdkUrl = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js';

function getKakaoWindow() {
  return window as Window & { Kakao?: KakaoSdk };
}

function loadKakaoSdk() {
  return new Promise<KakaoSdk>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Kakao share is only available in the browser.'));
      return;
    }

    const kakaoWindow = getKakaoWindow();

    if (kakaoWindow.Kakao) {
      resolve(kakaoWindow.Kakao);
      return;
    }

    const existingScript = document.getElementById(kakaoSdkScriptId) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (kakaoWindow.Kakao) {
          resolve(kakaoWindow.Kakao);
        } else {
          reject(new Error('Kakao SDK did not initialize.'));
        }
      }, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Kakao SDK.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = kakaoSdkScriptId;
    script.src = kakaoSdkUrl;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (kakaoWindow.Kakao) {
        resolve(kakaoWindow.Kakao);
      } else {
        reject(new Error('Kakao SDK did not initialize.'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Kakao SDK.'));
    document.head.appendChild(script);
  });
}

export function getKakaoJavaScriptKey() {
  return import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY as string | undefined;
}

export async function prepareKakaoShare(kakaoKey: string) {
  const kakao = await loadKakaoSdk();

  if (!kakao.isInitialized()) {
    kakao.init(kakaoKey);
  }

  if (!kakao.Share) {
    throw new Error('Kakao share is not available.');
  }

  return kakao.Share;
}
