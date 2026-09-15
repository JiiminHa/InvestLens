# Handoff

세션 시작 시 이 문서를 먼저 읽는다. 세션 종료 시 "이번에 뭘 바꿨는지 / 다음 세션이 뭘 해야 하는지"를 5줄 이내로 아래 로그에 추가한다. 위에서부터 최신순으로 쌓는다.

## 현재 우선순위 (세션 분할 계획)

1. 로깅 + 죽은 코드 정리 — 부분 완료, 아래 "세션 1 추가 작업" 마저 끝내고 넘어갈 것
2. 코치 화면 멀티턴 채팅화 (app.js가 session.turns를 버리고 최신 메시지만 렌더링하는 문제)
3. SKILL.md 다이어트 (ORIGINAL_SKILL.md는 보존, SKILL.md만 축소)
4. 실제 데이터 파이프라인 (리포트 텍스트 → 렌즈 관련 데이터 추출 → coachService 컨텍스트로 사용, fixture 하드코딩 대체)
5. 통합 확인 + 제출 정리

## 세션 1 추가 작업 (다음 Hermes 세션에 그대로 지시)

세션 1에서 만든 mock/real 배지 로직을 실행해서 확인해보니 실제로는 동작 안 함 + 기존에 있던 타입 에러들이 있음. 아래를 한 세션에서 정리:

- **버그**: `server.ts`의 `serveFile`이 `serveFile(res, "src/web/index.html")`처럼 전체 상대경로로 호출되는데, 내부 조건은 `if (path === "index.html")`이라 절대 참이 안 돼서 `window.__COACH_ENV` 마커가 실제로는 한 번도 주입되지 않는다. `path === "index.html"`을 `path.endsWith("index.html")`로 바꿀 것.
- **버그**: `package.json`에 `dotenv` 의존성은 있는데 어디서도 `import "dotenv/config"`를 호출하지 않아서 `.env`의 `UPSTAGE_API_KEY`가 실제로 로드되지 않는다. `server.ts` 맨 위(다른 import보다 먼저, coachService가 평가되기 전)에 `import "dotenv/config";` 추가할 것.
- **타입 에러 (npm test 기준, 세션 1 이전부터 있던 기존 버그)**:
  - `investLensService.ts`: `LearningSession` 타입이 `../domain/types`에서 import 안 됨 (`Cannot find name 'LearningSession'`, 여러 줄).
  - `coachService.ts`의 `callBeginnerStockCoach` 리턴 객체에 `readyToComplete: boolean` 필드가 빠져 있음 (타입은 요구하는데 실제 리턴에 없음). 판단 질문이 없는 턴(`!hasQuestion`)을 완료 신호로 보는 식으로 채우면 됨.
  - `investLensService.ts`의 `respond()` 안에서 만드는 `marketFixture` 객체가 `domain/types.ts`의 (안 쓰이는) `MarketSceneFixture` 모양(`id`, `verified`)으로 되어 있는데, 실제 import된 타입은 `fixtures/marketSceneFixtures.ts`의 것(`status: "unverified_mock" | "verified"`, `id` 없음)이라 안 맞음. `id`/`verified` 대신 `status: "verified"`로 바꿀 것.
  - `domain/types.ts`의 `MarketSceneFixture` interface는 어디서도 안 쓰이는 중복 정의라서 위 혼동의 원인임 — 지워도 됨(`fixtures/marketSceneFixtures.ts` 쪽이 실제로 쓰이는 것).
  - `seed.ts`의 seed 세션 3개 각각에 `LearningSession`이 요구하는 `turns`(빈 배열 가능)와 `phase` 필드가 빠져 있음. 이미 완료된 과거 세션들이니 `turns: []`, `phase: "ready_to_complete"` 정도면 됨.
  - `src/web/server-coach-mock.ts`는 이번 세션 1에서 `server.ts`의 마지막 import를 지웠기 때문에 이제 어디서도 안 쓰이는 죽은 파일이 됨 (grep 결과 참조 0). 삭제할 것.
  - `src/tests/goldenPath.test.ts`의 로컬 `mockCallBeginnerStockCoach`도 `readyToComplete`가 빠져서 타입 에러 남 — 같은 식으로 채워줄 것.
  - 다 고치고 나면 `npm test`가 타입에러 없이 golden path까지 통과해야 함(직접 검증 완료).

## 로그

### 2026-09-16 — 세션 1: 로깅 + 죽은 코드 정리

- server.ts의 `mockCoachTurn`/`mockCoachSummary` import 제거 완료 (서버 코드 내 미사용 확인 후 삭제, 실제 import 없음 재확인).
- index.html `coachBadge`와 app.js `ws-status` 문구를 `UPSTAGE_API_KEY` 존재 여부로 실제/모의 표시로 변경 완료: 서버가 `index.html` 서빙 시 첫 `<script>` 앞에 `window.__COACH_ENV="mock"/"real"` 인라인 스크립트 주입, app.js가 `window.__COACH_ENV`를 읽어 badge·ws-status에 반영.
- server.ts 각 API 핸들러(`/api/learning/start`, `respond`, `complete`)에 요청 시작 로그, coachService.ts `callSolar`에 호출 시작·Solar API 응답 status 로그, investLensService.ts 주요 분기(`startLearningTurn`, `completeLearning`, `respond`) 진입 로그 추가 완료 (모두 콘솔 로그).
- 다음 세션이 할 일: 세션 2 — 코치 화면 멀티턴 채팅화 (app.js가 `session.turns`를 버리고 최신 메시지만 렌더링하는 문제).
