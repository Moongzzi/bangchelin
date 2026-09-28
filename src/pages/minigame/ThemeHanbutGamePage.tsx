import { UnityMinigamePage, type UnityMinigameConfig } from './UnityMinigamePage';

const themeHanbutGameConfig: UnityMinigameConfig = {
  gameSlug: 'theme_hanbut',
  title: '테마한붓',
  assetRoot: `${import.meta.env.BASE_URL}unity/theme-hanbut`,
  loaderFile: 'WebGL.loader.js',
  dataFile: 'WebGL.data.unityweb',
  frameworkFile: 'WebGL.framework.js.unityweb',
  codeFile: 'WebGL.wasm.unityweb',
  companyName: 'TemaHanbut',
  productName: '테마한붓',
  productVersion: '1.0.0',
  canvasWidth: 960,
  canvasHeight: 600,
};

export function ThemeHanbutGamePage() {
  return <UnityMinigamePage config={themeHanbutGameConfig} />;
}
