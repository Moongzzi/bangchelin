# 방슐랭 Unity WebGL 미니게임 연동 명세

문서 버전: 1.0  
게임 API 식별자: `bangchelin-ddeok`

## 1. 연동 개요

Unity WebGL은 자체 로그인 화면을 만들지 않고, 방슐랭 사이트에 로그인된 Supabase 세션을 사용한다.

권장 호출 흐름은 다음과 같다.

```text
방슐랭 사이트 로그인
  → React 페이지에서 Unity WebGL 실행
  → Unity가 JavaScript Bridge 함수 호출
  → 사이트가 Supabase 인증 및 API 호출
  → Unity의 BangchelinBridge GameObject로 JSON 결과 전달
```

Unity에서는 Supabase URL, anon key, access token을 직접 관리하지 않고 `window.BangchelinUnityBridge`를 호출하는 방식을 기본으로 한다. 사이트가 access token 만료와 갱신을 담당한다.

## 2. 고정 연동 정보

| 항목 | 값 |
|---|---|
| 게임 slug | `bangchelin-ddeok` |
| Unity receiver GameObject | `BangchelinBridge` |
| 로그인 결과 메서드 | `OnAuthResult(string json)` |
| 개인 최고점 결과 메서드 | `OnMyBestResult(string json)` |
| 점수 저장 결과 메서드 | `OnScoreSubmitResult(string json)` |
| 점수 타입 | 32비트 정수(`int`) |
| 플레이 ID | UUID/GUID 문자열 |

현재 등록 SQL 기준 허용 점수 범위는 `0` 이상 `1,000,000` 이하이다. 운영 전에 실제 게임 규칙과 일치하는지 사이트 담당자와 확인한다.

## 3. Unity에서 호출할 JavaScript Bridge

### 3.1 로그인 사용자 요청

```javascript
window.BangchelinUnityBridge.requestAuth();
```

Unity callback:

```csharp
void OnAuthResult(string json)
```

성공 JSON:

```json
{
  "ok": true,
  "data": {
    "userId": "7adf7dc4-0a31-45be-b475-5ae122f5c474",
    "nickname": "플레이어",
    "avatarUrl": null,
    "accessToken": "eyJ...",
    "tokenType": "bearer",
    "expiresAt": 1789455600
  }
}
```

Unity는 `userId`, `nickname`, `avatarUrl`만 사용하면 된다. `accessToken`은 Unity에 저장하거나 PlayerPrefs에 기록하지 않는다.

### 3.2 개인 최고 기록 요청

```javascript
window.BangchelinUnityBridge.requestMyBest('bangchelin-ddeok');
```

Unity callback:

```csharp
void OnMyBestResult(string json)
```

기록이 있는 경우:

```json
{
  "ok": true,
  "data": {
    "gameId": "0e2e46d9-80f9-4f92-8a14-877091cdd11b",
    "gameSlug": "bangchelin-ddeok",
    "personalBest": 15200,
    "ranking": 7,
    "playCount": 12,
    "bestAchievedAt": "2026-09-15T06:20:00Z"
  }
}
```

플레이 기록이 없는 경우:

```json
{
  "ok": true,
  "data": {
    "gameId": "0e2e46d9-80f9-4f92-8a14-877091cdd11b",
    "gameSlug": "bangchelin-ddeok",
    "personalBest": null,
    "ranking": null,
    "playCount": 0,
    "bestAchievedAt": null
  }
}
```

게임이 등록되지 않았거나 비활성 상태이면 `data`가 `null`일 수 있다.

### 3.3 게임 점수 저장

```javascript
window.BangchelinUnityBridge.submitScore(JSON.stringify({
  gameSlug: 'bangchelin-ddeok',
  score: 15200,
  clientRunId: '50a2e5a3-fd40-49b0-bfe2-9db07516f72f',
  durationMs: 82134,
  clientVersion: '1.0.0',
  metadata: {
    stage: 5
  }
}));
```

Unity callback:

```csharp
void OnScoreSubmitResult(string json)
```

성공 JSON:

```json
{
  "ok": true,
  "data": {
    "submissionId": "2b439ac2-e649-4abc-9898-92d3dc061813",
    "gameId": "0e2e46d9-80f9-4f92-8a14-877091cdd11b",
    "gameSlug": "bangchelin-ddeok",
    "score": 15200,
    "personalBest": 15200,
    "isPersonalBest": true,
    "ranking": 7,
    "submittedAt": "2026-09-15T06:20:00Z",
    "isDuplicate": false
  }
}
```

### 3.4 공통 실패 JSON

세 Bridge callback은 모두 같은 실패 형태를 사용한다.

```json
{
  "ok": false,
  "error": {
    "message": "로그인이 필요합니다."
  }
}
```

`ok`가 `false`이면 `data`를 사용하지 않고 사용자에게 재시도 또는 사이트 로그인 안내를 표시한다.

## 4. 점수 저장 요청 필드

| 필드 | Type | 필수 | 설명 |
|---|---|---:|---|
| `gameSlug` | `string` | O | 항상 `bangchelin-ddeok` |
| `score` | `int` | O | 게임 최종 점수 |
| `clientRunId` | UUID `string` | O | 한 판마다 생성하는 멱등 키 |
| `durationMs` | `int?` | X | 플레이 시간(ms), 0 이상 |
| `clientVersion` | `string?` | X | Unity 게임 버전, 최대 50자 |
| `metadata` | JSON object | X | 스테이지 등 부가정보, 최대 4096 bytes |

### `clientRunId` 규칙

1. 게임 한 판이 시작될 때 `Guid.NewGuid().ToString()`으로 생성한다.
2. 해당 판이 끝날 때까지 같은 값을 유지한다.
3. 저장 실패 후 재시도할 때 새로운 GUID를 만들지 않는다.
4. 새로운 게임을 시작할 때만 새로운 GUID를 만든다.

동일 사용자·게임·`clientRunId` 요청은 서버에 한 번만 저장된다. 재요청 결과의 `isDuplicate`는 `true`가 된다.

## 5. Unity WebGL `.jslib` 예제

파일 위치 예시: `Assets/Plugins/WebGL/BangchelinBridge.jslib`

```javascript
mergeInto(LibraryManager.library, {
  Bangchelin_RequestAuth: function () {
    if (!window.BangchelinUnityBridge) {
      console.error('BangchelinUnityBridge is not installed.');
      return;
    }

    window.BangchelinUnityBridge.requestAuth();
  },

  Bangchelin_RequestMyBest: function (gameSlugPtr) {
    if (!window.BangchelinUnityBridge) {
      console.error('BangchelinUnityBridge is not installed.');
      return;
    }

    window.BangchelinUnityBridge.requestMyBest(UTF8ToString(gameSlugPtr));
  },

  Bangchelin_SubmitScore: function (jsonPtr) {
    if (!window.BangchelinUnityBridge) {
      console.error('BangchelinUnityBridge is not installed.');
      return;
    }

    window.BangchelinUnityBridge.submitScore(UTF8ToString(jsonPtr));
  }
});
```

Unity Editor, Windows/Mac Standalone 등 WebGL이 아닌 플랫폼에서는 별도 mock 구현을 사용한다.

## 6. Unity C# receiver 예제

아래 예제는 JSON의 `null` 값을 정확히 처리하기 위해 Unity Package Manager의 `com.unity.nuget.newtonsoft-json` 패키지를 사용한다. 스크립트가 연결된 GameObject 이름은 정확히 `BangchelinBridge`여야 한다.

```csharp
using System;
using System.Runtime.InteropServices;
using Newtonsoft.Json;
using UnityEngine;

public class BangchelinBridge : MonoBehaviour
{
    private const string GameSlug = "bangchelin-ddeok";
    private string currentRunId;

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void Bangchelin_RequestAuth();

    [DllImport("__Internal")]
    private static extern void Bangchelin_RequestMyBest(string gameSlug);

    [DllImport("__Internal")]
    private static extern void Bangchelin_SubmitScore(string json);
#endif

    public void RequestAuth()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        Bangchelin_RequestAuth();
#else
        Debug.Log("RequestAuth mock");
#endif
    }

    public void RequestMyBest()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        Bangchelin_RequestMyBest(GameSlug);
#else
        Debug.Log("RequestMyBest mock");
#endif
    }

    public void BeginRun()
    {
        currentRunId = Guid.NewGuid().ToString();
    }

    public void SubmitScore(int score, int durationMs, int stage)
    {
        if (string.IsNullOrEmpty(currentRunId))
        {
            Debug.LogError("BeginRun must be called before SubmitScore.");
            return;
        }

        var request = new ScoreSubmitRequest
        {
            gameSlug = GameSlug,
            score = score,
            clientRunId = currentRunId,
            durationMs = durationMs,
            clientVersion = Application.version,
            metadata = new ScoreMetadata { stage = stage }
        };

#if UNITY_WEBGL && !UNITY_EDITOR
        Bangchelin_SubmitScore(JsonConvert.SerializeObject(request));
#else
        Debug.Log(JsonConvert.SerializeObject(request));
#endif
    }

    // JavaScript에서 Unity SendMessage로 호출한다.
    public void OnAuthResult(string json)
    {
        var result = JsonConvert.DeserializeObject<AuthResult>(json);
        if (!result.ok)
        {
            Debug.LogError(result.error?.message);
            return;
        }

        Debug.Log($"Signed in: {result.data.nickname}");
    }

    public void OnMyBestResult(string json)
    {
        var result = JsonConvert.DeserializeObject<MyBestResult>(json);
        if (!result.ok)
        {
            Debug.LogError(result.error?.message);
            return;
        }

        if (result.data == null || !result.data.personalBest.HasValue)
        {
            Debug.Log("No score yet.");
            return;
        }

        Debug.Log($"Personal best: {result.data.personalBest.Value}");
    }

    public void OnScoreSubmitResult(string json)
    {
        var result = JsonConvert.DeserializeObject<ScoreSubmitResult>(json);
        if (!result.ok)
        {
            Debug.LogError(result.error?.message);
            // 같은 currentRunId로 재시도할 수 있도록 값을 유지한다.
            return;
        }

        Debug.Log($"Saved score: {result.data.score}, best: {result.data.personalBest}");
        currentRunId = null;
    }
}

[Serializable]
public class ApiError
{
    public string message;
}

[Serializable]
public class ScoreMetadata
{
    public int stage;
}

[Serializable]
public class ScoreSubmitRequest
{
    public string gameSlug;
    public int score;
    public string clientRunId;
    public int durationMs;
    public string clientVersion;
    public ScoreMetadata metadata;
}

[Serializable]
public class AuthData
{
    public string userId;
    public string nickname;
    public string avatarUrl;
    public string accessToken;
    public string tokenType;
    public long expiresAt;
}

[Serializable]
public class AuthResult
{
    public bool ok;
    public AuthData data;
    public ApiError error;
}

[Serializable]
public class MyBestData
{
    public string gameId;
    public string gameSlug;
    public int? personalBest;
    public long? ranking;
    public int playCount;
    public string bestAchievedAt;
}

[Serializable]
public class MyBestResult
{
    public bool ok;
    public MyBestData data;
    public ApiError error;
}

[Serializable]
public class ScoreSubmitData
{
    public string submissionId;
    public string gameId;
    public string gameSlug;
    public int score;
    public int personalBest;
    public bool isPersonalBest;
    public long? ranking;
    public string submittedAt;
    public bool isDuplicate;
}

[Serializable]
public class ScoreSubmitResult
{
    public bool ok;
    public ScoreSubmitData data;
    public ApiError error;
}
```

Unity 기본 `JsonUtility`는 JSON의 숫자 `null`을 nullable 숫자로 안전하게 역직렬화하지 못하므로 이 명세의 예제는 Newtonsoft Json.NET을 사용한다.

## 7. 실제 Supabase REST/RPC 명세

일반적인 Unity 연동에서는 이 endpoint를 직접 호출하지 않고 3절의 Bridge를 사용한다. Postman이나 서버 확인이 필요한 경우에만 아래 명세를 사용한다.

Base URL:

```text
<SUPABASE_URL>/rest/v1
```

공통 headers:

```http
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <USER_ACCESS_TOKEN>
Content-Type: application/json
```

`SUPABASE_ANON_KEY`는 공개 클라이언트 키이지만 `service_role` 키는 절대 Unity 프로젝트, 빌드 파일, 문서 또는 메신저로 공유하지 않는다. refresh token도 Unity에 전달하지 않는다.

### 7.1 사용자 확인 API

```http
POST /rpc/get_webgl_player
```

Request body:

```json
{}
```

Raw response:

```json
[
  {
    "user_id": "7adf7dc4-0a31-45be-b475-5ae122f5c474",
    "nickname": "플레이어",
    "avatar_url": null
  }
]
```

### 7.2 개인 최고 기록 API

```http
POST /rpc/get_my_minigame_best
```

Request body:

```json
{
  "p_game_slug": "bangchelin-ddeok"
}
```

Raw response:

```json
[
  {
    "game_id": "0e2e46d9-80f9-4f92-8a14-877091cdd11b",
    "game_slug": "bangchelin-ddeok",
    "personal_best": 15200,
    "ranking": 7,
    "play_count": 12,
    "best_achieved_at": "2026-09-15T06:20:00Z"
  }
]
```

### 7.3 점수 저장 API

```http
POST /rpc/submit_minigame_score
```

Request body:

```json
{
  "p_game_slug": "bangchelin-ddeok",
  "p_score": 15200,
  "p_client_run_id": "50a2e5a3-fd40-49b0-bfe2-9db07516f72f",
  "p_duration_ms": 82134,
  "p_client_version": "1.0.0",
  "p_metadata": {
    "stage": 5
  }
}
```

Raw response:

```json
[
  {
    "submission_id": "2b439ac2-e649-4abc-9898-92d3dc061813",
    "game_id": "0e2e46d9-80f9-4f92-8a14-877091cdd11b",
    "game_slug": "bangchelin-ddeok",
    "score": 15200,
    "personal_best": 15200,
    "is_personal_best": true,
    "ranking": 7,
    "submitted_at": "2026-09-15T06:20:00Z",
    "is_duplicate": false
  }
]
```

### 7.4 사이트 랭킹 API

Unity 게임 필수 API는 아니며 방슐랭 사이트의 랭킹 화면에서 사용한다.

```http
POST /rpc/get_minigame_ranking
```

Request body:

```json
{
  "p_game_slug": "bangchelin-ddeok",
  "p_limit": 50,
  "p_offset": 0
}
```

게임별로 각 계정의 유효한 최고 점수 한 건만 반환한다.

## 8. 호출 시점

권장 호출 순서는 다음과 같다.

1. WebGL 초기화 완료 후 `requestAuth()` 호출
2. 인증 성공 후 메인 메뉴에서 `requestMyBest()` 호출
3. 실제 플레이 시작 직전에 `BeginRun()`으로 GUID 생성
4. 게임 종료 시 `submitScore()` 호출
5. 저장 성공 후 반환된 `personalBest`, `isPersonalBest`, `ranking` 표시
6. 저장 실패 시 같은 `clientRunId`로 재시도

API 응답을 기다리는 동안 Unity UI에서 중복 버튼 입력을 막고 loading 상태를 표시한다.

## 9. 오류 및 제한 사항

- 로그인하지 않은 사용자: API 호출 실패, 사이트 로그인 안내
- 승인 대기/거절/휴면 계정: API 호출 실패
- 등록되지 않았거나 비활성인 slug: 조회 결과 없음 또는 저장 실패
- 허용 범위 밖 점수: 저장 실패
- 사용자·게임별 분당 30회 초과 제출: 저장 실패
- `clientVersion`: 최대 50자
- `metadata`: JSON object, 최대 4096 bytes
- 저장 API는 사용자 ID를 요청으로 받지 않는다. 서버가 access token의 사용자 ID를 사용한다.

WebGL은 브라우저에서 실행되므로 클라이언트가 계산한 점수는 조작 가능하다. 상품·보상과 연계되는 게임이라면 플레이 이벤트, 서버 nonce, 리플레이 등의 추가 서버 검증을 별도로 설계해야 한다.

## 10. 납품 및 통합 테스트 체크리스트

Unity 개발자 납품 항목:

- WebGL Build 폴더 전체
- TemplateData 등 실행에 필요한 전체 파일
- `BangchelinBridge.jslib`
- `BangchelinBridge` GameObject와 receiver script가 포함된 scene
- Unity 버전 및 `Application.version`
- 게임 점수 계산 규칙
- `metadata`에 전달하는 필드 설명

통합 테스트:

- 로그인 사용자의 `nickname` 수신
- 기록이 없는 사용자의 empty 상태
- 첫 점수 저장
- 낮은 점수를 추가로 저장했을 때 최고점 유지
- 높은 점수를 저장했을 때 최고점 갱신
- 같은 `clientRunId` 재전송 시 `isDuplicate = true`
- 매 게임 기록이 DB에 각각 저장되는지 확인
- 사이트 랭킹에 계정별 최고 기록만 한 번 표시되는지 확인
- 로그아웃 및 비활성 계정의 요청 거절 확인
