# Bangchelin

Vite + React 기반 Bangchelin 웹 애플리케이션입니다.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## GitHub Actions deployment

이 저장소는 GitHub Pages 자동배포를 위해 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)을 사용합니다.

배포 트리거:

- `master` 브랜치로 push
- GitHub Actions의 `workflow_dispatch` 수동 실행

최초 1회 GitHub 저장소 설정에서 아래만 확인하면 됩니다.

1. GitHub 저장소의 `Settings > Pages`로 이동합니다.
2. `Source`를 `GitHub Actions`로 설정합니다.
3. `master` 브랜치에 이 워크플로 파일을 push 합니다.

배포가 시작되면 Actions가 아래 순서로 처리합니다.

1. 의존성 설치
2. GitHub Pages용 base 경로로 프로덕션 빌드
3. SPA 새로고침 대응용 `404.html` 생성
4. Pages에 아티팩트 업로드 및 배포

배포 URL 형식:

```text
https://<github-username>.github.io/bangchelin/
```
