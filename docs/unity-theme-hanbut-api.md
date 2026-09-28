# `theme_hanbut` Unity WebGL 랭킹 연동 명세

문서 버전: 1.0  
게임 slug: `theme_hanbut`

## 1. 랭킹 집계 규칙

- 게임이 끝날 때마다 점수 기록을 저장한다.
- 랭킹에는 계정별 유효한 최고 점수 한 건만 반영한다.
- 점수가 높을수록 높은 순위다.
- 동점자는 같은 순위이며, 최고 점수를 먼저 달성한 계정이 먼저 표시된다.
- 현재 허용 점수 범위는 `0`부터 `2,147,483,647`까지의 32비트 정수다.

랭킹 자체를 별도로 저장하는 API는 없다. 점수 저장 API가 원본 기록을 추가하고 서버가 최고 기록과 랭킹을 계산한다.

## 2. 권장 연동 방식: 사이트 JavaScript Bridge

Unity 빌드가 방슐랭 사이트 안에서 실행될 때는 Supabase를 직접 호출하지 않고 아래 브리지를 사용한다. 사이트가 로그인 세션과 access token 갱신을 담당한다.

| 항목 | 값 |
|---|---|
| Receiver GameObject | `BangchelinBridge` |
| 로그인 callback | `OnAuthResult(string json)` |
| 개인 최고점 callback | `OnMyBestResult(string json)` |
| 점수 저장 callback | `OnScoreSubmitResult(string json)` |

### 로그인 정보 요청

```javascript
window.BangchelinUnityBridge.requestAuth();
```

`OnAuthResult(string json)` 성공 응답:

```json
{
  "ok": true,
  "data": {
    "userId": "7adf7dc4-0a31-45be-b475-5ae122f5c474",
    "nickname": "플레이어",
    "avatarUrl": null,
    "accessToken": "eyJ...",
    "tokenType": "bearer",
    "expiresAt": 1790576400
  }
}
```

Unity에서는 사용자 표시용 `userId`, `nickname`, `avatarUrl`만 사용한다. `accessToken`을 PlayerPrefs 등에 저장하면 안 된다.

### 개인 최고 기록 요청

```javascript
window.BangchelinUnityBridge.requestMyBest('theme_hanbut');
```

기록이 없는 경우에도 성공 응답이며 `personalBest`, `ranking`, `bestAchievedAt`은 `null`, `playCount`는 `0`이다.

`OnMyBestResult(string json)` 성공 응답:

```json
{
  "ok": true,
  "data": {
    "gameId": "0e2e46d9-80f9-4f92-8a14-877091cdd11b",
    "gameSlug": "theme_hanbut",
    "personalBest": 12500,
    "ranking": 7,
    "playCount": 12,
    "bestAchievedAt": "2026-09-28T06:20:00Z"
  }
}
```

### 게임 점수 저장

```javascript
window.BangchelinUnityBridge.submitScore(JSON.stringify({
  gameSlug: 'theme_hanbut',
  score: 12500,
  clientRunId: '50a2e5a3-fd40-49b0-bfe2-9db07516f72f',
  durationMs: 82134,
  clientVersion: '1.0.0',
  metadata: {}
}));
```

요청 필드:

| 필드 | Type | 필수 | 설명 |
|---|---|---:|---|
| `gameSlug` | `string` | O | 항상 `theme_hanbut` |
| `score` | `int` | O | 최종 점수, 0 이상 |
| `clientRunId` | UUID `string` | O | 한 판마다 생성하는 고유 ID |
| `durationMs` | `int?` | X | 플레이 시간(ms), 0 이상 |
| `clientVersion` | `string?` | X | Unity 빌드 버전, 최대 50자 |
| `metadata` | JSON object | X | 부가 정보, 최대 4096 bytes |

`clientRunId`는 게임 시작 시 `Guid.NewGuid().ToString()`으로 생성한다. 저장 실패 후 재시도할 때는 같은 값을 사용해야 중복 기록이 생기지 않는다.

## 3. Unity WebGL `.jslib`

파일 예시: `Assets/Plugins/WebGL/BangchelinBridge.jslib`

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

## 4. Unity C# 호출 예시

```csharp
using System;
using System.Runtime.InteropServices;
using Newtonsoft.Json;
using UnityEngine;

public class BangchelinBridge : MonoBehaviour
{
    private const string GameSlug = "theme_hanbut";
    private string currentRunId;

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void Bangchelin_RequestAuth();

    [DllImport("__Internal")]
    private static extern void Bangchelin_RequestMyBest(string gameSlug);

    [DllImport("__Internal")]
    private static extern void Bangchelin_SubmitScore(string json);
#endif

    public void BeginRun()
    {
        currentRunId = Guid.NewGuid().ToString();
    }

    public void RequestMyBest()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        Bangchelin_RequestMyBest(GameSlug);
#endif
    }

    public void SubmitScore(int score, int durationMs)
    {
        if (string.IsNullOrEmpty(currentRunId))
        {
            Debug.LogError("BeginRun must be called before SubmitScore.");
            return;
        }

        var request = new
        {
            gameSlug = GameSlug,
            score,
            clientRunId = currentRunId,
            durationMs,
            clientVersion = Application.version,
            metadata = new { }
        };

#if UNITY_WEBGL && !UNITY_EDITOR
        Bangchelin_SubmitScore(JsonConvert.SerializeObject(request));
#endif
    }

    public void OnAuthResult(string json) { /* 로그인 결과 처리 */ }
    public void OnMyBestResult(string json) { /* 최고점 결과 처리 */ }
    public void OnScoreSubmitResult(string json) { /* 저장 결과 처리 */ }
}
```

Receiver 스크립트가 연결된 GameObject 이름은 정확히 `BangchelinBridge`여야 한다.

## 5. 점수 저장 응답

Unity의 `OnScoreSubmitResult(string json)`으로 다음 형태가 전달된다.

```json
{
  "ok": true,
  "data": {
    "submissionId": "2b439ac2-e649-4abc-9898-92d3dc061813",
    "gameId": "0e2e46d9-80f9-4f92-8a14-877091cdd11b",
    "gameSlug": "theme_hanbut",
    "score": 12500,
    "personalBest": 12500,
    "isPersonalBest": true,
    "ranking": 7,
    "submittedAt": "2026-09-28T06:20:00Z",
    "isDuplicate": false
  }
}
```

실패 응답:

```json
{
  "ok": false,
  "error": {
    "message": "오류 메시지"
  }
}
```

## 6. Supabase REST/RPC 명세

사이트 브리지 대신 직접 검증할 때 사용하는 명세다.

Base URL:

```text
<SUPABASE_URL>/rest/v1
```

공통 header:

```http
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <USER_ACCESS_TOKEN>
Content-Type: application/json
```

`service_role` 키와 refresh token은 Unity 프로젝트나 WebGL 빌드에 포함하면 안 된다.

### 점수 저장

```http
POST /rpc/submit_minigame_score
```

```json
{
  "p_game_slug": "theme_hanbut",
  "p_score": 12500,
  "p_client_run_id": "50a2e5a3-fd40-49b0-bfe2-9db07516f72f",
  "p_duration_ms": 82134,
  "p_client_version": "1.0.0",
  "p_metadata": {}
}
```

REST/RPC 응답은 배열 형태다.

```json
[
  {
    "submission_id": "2b439ac2-e649-4abc-9898-92d3dc061813",
    "game_id": "0e2e46d9-80f9-4f92-8a14-877091cdd11b",
    "game_slug": "theme_hanbut",
    "score": 12500,
    "personal_best": 12500,
    "is_personal_best": true,
    "ranking": 7,
    "submitted_at": "2026-09-28T06:20:00Z",
    "is_duplicate": false
  }
]
```

### 개인 최고 기록 조회

```http
POST /rpc/get_my_minigame_best
```

```json
{
  "p_game_slug": "theme_hanbut"
}
```

### 계정별 최고점 랭킹 조회

```http
POST /rpc/get_minigame_ranking
```

```json
{
  "p_game_slug": "theme_hanbut",
  "p_limit": 50,
  "p_offset": 0
}
```

응답:

```json
[
  {
    "ranking": 1,
    "user_id": "7adf7dc4-0a31-45be-b475-5ae122f5c474",
    "nickname": "플레이어",
    "score": 30000,
    "best_achieved_at": "2026-09-28T05:00:00Z",
    "is_me": false
  }
]
```

## 7. 필수 테스트

1. 첫 점수를 저장하면 `isPersonalBest`가 `true`인지 확인한다.
2. 같은 `clientRunId`로 재요청하면 `isDuplicate`가 `true`이고 기록이 추가되지 않는지 확인한다.
3. 새 `clientRunId`로 낮은 점수를 저장하면 플레이 기록은 추가되고 최고점은 유지되는지 확인한다.
4. 높은 점수를 저장하면 최고점과 순위가 변경되는지 확인한다.
5. 한 계정에 기록이 여러 개 있어도 랭킹에는 최고 점수 한 건만 표시되는지 확인한다.
6. 로그아웃 상태에서 저장 요청이 거절되는지 확인한다.
