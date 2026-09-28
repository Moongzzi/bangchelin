import { UnityMinigamePage, type UnityMinigameConfig } from './UnityMinigamePage';

const ddeokGameConfig: UnityMinigameConfig = {
  gameSlug: 'bangchelin-ddeok',
  title: '보름달 합치기',
  assetRoot: `${import.meta.env.BASE_URL}unity/bangchelin-ddeok`,
  loaderFile: 'WebGL.loader.js',
  dataFile: 'WebGL.data',
  frameworkFile: 'WebGL.framework.js',
  codeFile: 'WebGL.wasm',
  companyName: 'DefaultCompany',
  productName: 'Boreumdal Hapchigi',
  productVersion: '1.0',
  canvasWidth: 960,
  canvasHeight: 600,
};

export function DdeokGamePage() {
  return <UnityMinigamePage config={ddeokGameConfig} />;
}
