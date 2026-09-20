# Unity WebGL 미니게임 API 설계

## 1. 프로젝트 분석 결과

- 인증은 Supabase Auth를 사용하며 세션은 `bangchelin.supabase.session` 키로 `localStorage` 또는 `sessionStorage`에 저장됩니다.
- 프론트엔드는 `src/shared/api/supabaseRest.ts`를 통해 access token 갱신과 REST/RPC 호출을 처리합니다.
- 승인 완료 및 활성 상태인 `profiles` 사용자만 서비스 기능을 이용할 수 있습니다.
- 기존 미로 콘텐츠는 별도 도메인이므로 Unity 미니게임 기록과 섞지 않고 독립 모델로 구성했습니다.
- 현재 저장소에는 Unity 빌드와 이를 렌더링하는 페이지가 없습니다. 이번 구현은 Unity 연동에 필요한 DB/RPC, React API 모듈, JS 브리지를 제공합니다.

## 2. 필요한 데이터 모델

### `minigames`

게임별 slug, 이름, 활성 상태 및 허용 점수 범위를 관리합니다.

### `minigame_score_records`

게임 종료마다 한 행을 추가하는 원본 기록입니다. 사용자별 최고점은 별도 행으로 복제하지 않고 유효한 원본 기록에서 집계합니다.

`client_run_id`는 Unity가 플레이 시작 때 생성하는 UUID입니다. 동일 UUID로 저장을 재시도하면 기존 결과가 반환되므로 네트워크 재시도에 안전합니다.

## 3. DB 설계

관계는 다음과 같습니다.

```text
profiles (1) ──< minigame_score_records >── (1) minigames
```

- 모든 플레이 기록 유지: `minigame_score_records` append-only
- 개인 최고점: `max(score)` 및 최고점 최초 달성 시각
- 랭킹: 게임별·계정별 유효 최고점 한 건만 선정
- 동점: 같은 등수(`dense_rank`), 표시는 먼저 최고점을 달성한 계정 우선
- 운영 검증: `is_valid = false`인 기록은 개인 최고점과 랭킹에서 제외
- 점수 범위: 각 게임의 `min_score`와 `max_score`로 검증
- 제출 제한: 사용자·게임당 분당 30회

## 4. SQL Migration

실행 파일: `supabase/migrations/20260915100000_add_webgl_minigame_scores.sql`

Supabase SQL Editor에서 파일 전체를 실행하거나 CLI를 사용합니다.

```bash
supabase db push
```

게임을 처음 등록하는 예시입니다. slug는 Unity와 웹에서 공통 식별자로 사용합니다.

```sql
insert into public.minigames (slug, title, min_score, max_score)
values ('sample-runner', 'Sample Runner', 0, 1000000)
on conflict (slug) do update
set title = excluded.title,
    min_score = excluded.min_score,
    max_score = excluded.max_score;
```

## 5. RLS 정책

- 활성·승인 회원만 활성 게임을 읽을 수 있습니다.
- 회원은 본인의 원본 기록만 조회할 수 있습니다.
- 일반 회원에게 원본 기록 INSERT/DELETE 권한을 부여하지 않았습니다. 저장은 `submit_minigame_score` RPC만 사용합니다.
- 사용자 ID는 요청에서 받지 않고 JWT의 `auth.uid()`만 사용합니다.
- 관리자는 게임 설정을 관리하고 기록을 무효화할 수 있습니다.
- 랭킹은 `SECURITY DEFINER` RPC가 공개 가능한 필드만 반환합니다.
- `service_role` 키와 refresh token은 Unity 또는 React에 전달하지 않습니다.

주의: WebGL 클라이언트가 직접 계산해 보낸 점수는 브라우저 개발자 도구로 조작할 수 있습니다. 보상이 걸린 경쟁 게임은 Edge Function 또는 별도 게임 서버에서 플레이 이벤트/리플레이를 검증한 뒤 `is_valid`를 확정하는 구조가 필요합니다.

## 6. API 설계

공통 URL은 `${VITE_SUPABASE_URL}/rest/v1`이며 모든 요청에 아래 헤더가 필요합니다.

```http
apikey: <Supabase anon key>
Authorization: Bearer <Supabase access token>
Content-Type: application/json
```

### WebGL 로그인 사용자 확인

- 기능: 전달된 access token을 검증하고 Unity 표시용 사용자 정보를 반환
- Method: `POST`
- Endpoint: `/rpc/get_webgl_player`
- 인증: 필요
- 관련 테이블: `profiles`

Request:

```json
{}
```

Response:

```json
[
  {
    "user_id": "7adf7dc4-0a31-45be-b475-5ae122f5c474",
    "nickname": "플레이어",
    "avatar_url": null
  }
]
```

### 개인 최고 기록 조회

- 기능: 본인의 최고점, 전체 순위, 총 플레이 횟수 조회
- Method: `POST`
- Endpoint: `/rpc/get_my_minigame_best`
- 인증: 필요
- 관련 테이블: `minigames`, `minigame_score_records`

Request:

```json
{ "p_game_slug": "sample-runner" }
```

Response (기록이 없으면 `personal_best`, `ranking`, `best_achieved_at`은 null):

```json
[
  {
    "game_id": "0e2e46d9-80f9-4f92-8a14-877091cdd11b",
    "game_slug": "sample-runner",
    "personal_best": 15200,
    "ranking": 7,
    "play_count": 12,
    "best_achieved_at": "2026-09-15T06:20:00Z"
  }
]
```

### 게임 기록 저장

- 기능: 한 번의 플레이 기록 저장 및 갱신된 최고점/순위 반환
- Method: `POST`
- Endpoint: `/rpc/submit_minigame_score`
- 인증: 필요
- 관련 테이블: `minigames`, `minigame_score_records`

Request:

```json
{
  "p_game_slug": "sample-runner",
  "p_score": 15200,
  "p_client_run_id": "50a2e5a3-fd40-49b0-bfe2-9db07516f72f",
  "p_duration_ms": 82134,
  "p_client_version": "1.0.0",
  "p_metadata": { "stage": 5 }
}
```

Response:

```json
[
  {
    "submission_id": "2b439ac2-e649-4abc-9898-92d3dc061813",
    "game_id": "0e2e46d9-80f9-4f92-8a14-877091cdd11b",
    "game_slug": "sample-runner",
    "score": 15200,
    "personal_best": 15200,
    "is_personal_best": true,
    "ranking": 7,
    "submitted_at": "2026-09-15T06:20:00Z",
    "is_duplicate": false
  }
]
```

동일한 `p_client_run_id`를 재전송하면 새 행을 만들지 않고 `is_duplicate: true`로 반환합니다.

### 계정별 최고점 랭킹 조회

- 기능: 각 계정의 유효 최고 기록만 한 건씩 표시
- Method: `POST`
- Endpoint: `/rpc/get_minigame_ranking`
- 인증: 필요
- 관련 테이블: `minigames`, `minigame_score_records`, `profiles`

Request:

```json
{
  "p_game_slug": "sample-runner",
  "p_limit": 50,
  "p_offset": 0
}
```

Response:

```json
[
  {
    "ranking": 1,
    "user_id": "7adf7dc4-0a31-45be-b475-5ae122f5c474",
    "nickname": "플레이어",
    "score": 30000,
    "best_achieved_at": "2026-09-15T05:00:00Z",
    "is_me": false
  }
]
```

## 7. 수정 또는 생성 파일 목록

- `supabase/migrations/20260915100000_add_webgl_minigame_scores.sql`
- `src/features/minigame/minigame.types.ts`
- `src/features/minigame/minigame.api.ts`
- `src/features/minigame/unityWebGLBridge.ts`
- `docs/webgl-minigame-api.md`

## 8. React 연동 코드

Unity 인스턴스 생성 직후 브리지를 설치하고 컴포넌트 정리 시 해제합니다.

```tsx
useEffect(() => {
  if (!unityInstance) return;
  return installUnityWebGLBridge(unityInstance, 'BangchelinBridge');
}, [unityInstance]);
```

Unity WebGL 플러그인(`Assets/Plugins/WebGL/BangchelinBridge.jslib`) 예시:

```javascript
mergeInto(LibraryManager.library, {
  Bangchelin_RequestAuth: function () {
    window.BangchelinUnityBridge.requestAuth();
  },
  Bangchelin_RequestMyBest: function (gameSlugPtr) {
    window.BangchelinUnityBridge.requestMyBest(UTF8ToString(gameSlugPtr));
  },
  Bangchelin_SubmitScore: function (jsonPtr) {
    window.BangchelinUnityBridge.submitScore(UTF8ToString(jsonPtr));
  }
});
```

Unity의 `BangchelinBridge` GameObject에 `OnAuthResult(string json)`, `OnMyBestResult(string json)`, `OnScoreSubmitResult(string json)` 메서드를 둡니다. 각 콜백은 `{ "ok": true, "data": ... }` 또는 `{ "ok": false, "error": { "message": "..." } }` 형태입니다.

게임 시작 시 `Guid.NewGuid().ToString()`을 생성해 해당 플레이가 끝날 때까지 같은 `clientRunId`를 사용합니다. 저장 실패 후 재시도할 때도 UUID를 새로 만들지 않아야 합니다.

Unity가 React 브리지를 통해 조회·저장하면 토큰 갱신도 기존 사이트 코드에서 처리됩니다. `requestAuth()` 응답의 access token을 Unity가 직접 사용할 수도 있지만, 만료 시 다시 `requestAuth()`를 호출해야 하므로 일반적으로는 브리지 호출 방식을 권장합니다.

## 9. 테스트 방법

1. migration을 적용하고 `minigames`에 테스트 게임을 등록합니다.
2. 승인된 활성 계정으로 사이트에 로그인합니다.
3. 게임 시작 시 UUID를 만들고 점수를 한 번 제출합니다.
4. 같은 UUID로 다시 제출해 `is_duplicate = true`이고 행 개수가 늘지 않는지 확인합니다.
5. 다른 UUID로 더 낮은 점수를 제출해 원본 행은 늘고 개인 최고점은 유지되는지 확인합니다.
6. 더 높은 점수를 제출해 개인 최고점과 랭킹이 바뀌는지 확인합니다.
7. 동일 계정의 기록이 여러 개여도 랭킹에는 한 행만 표시되는지 확인합니다.
8. 로그아웃·대기 승인·휴면 계정에서 RPC가 거절되는지 확인합니다.
9. 다른 회원이 REST 테이블 endpoint로 원본 기록을 INSERT하거나 타인의 원본 기록을 SELECT할 수 없는지 확인합니다.
10. 관리자 계정으로 기록을 `is_valid = false`, `invalid_reason = '검증 실패'`로 수정한 뒤 최고점과 랭킹에서 제외되는지 확인합니다.

프론트 타입 검증:

```bash
npx tsc -b --pretty false
npm run build
```

## 10. 추가 확인 필요 사항

- 실제 Unity 빌드가 들어갈 페이지/라우트와 Unity receiver GameObject 이름
- 각 게임의 slug, 최대 허용 점수, 점수 계산 규칙
- 랭킹 공개 범위(로그인 회원 전용 또는 비회원 공개)
- 보상성 경쟁 여부와 부정 점수 검증 수준
- 시즌 랭킹이 필요할 경우 시즌 모델과 기록 귀속 규칙
