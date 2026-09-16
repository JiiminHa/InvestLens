# Handoff

세션 시작 시 이 문서를 먼저 읽는다. 세션 종료 시 "이번에 뭘 바꿨는지 / 다음 세션이 뭘 해야 하는지"를 5줄 이내로 아래 로그에 추가한다. 위에서부터 최신순으로 쌓는다.

## 끝난 것

1. 로깅 + 죽은 코드 정리 (`ce64d8b`) — mock import 제거, 콘솔 로깅, 타입 에러 정리, golden path 통과
2. 서버 dotenv/serveFile 버그 수정 (`aaa7115`) — `.env`의 `UPSTAGE_API_KEY` 실제 로드, mock/real 배지 정상 표시
3. 코치 패널 멀티턴 채팅 UI (`d3b85d1`) — `paintWorkspaceRight`/`bindWorkspaceEvents`가 `state.currentSession.turns` 기반으로 렌더링, `/api/learning/respond` 연동. curl로 다턴 검증 완료
4. SKILL.md 다이어트 (PR #8, `d33e9ff`, 머지됨) — 199줄→72줄, 핵심 3규칙(한 턴 작게/렌즈 하나만/상태 내부 누적)과 렌즈 4개 예시는 유지, 중복 섹션·예시·편집 메모 제거
5. 워크스페이스 리포트 텍스트 입력 경로 연결 (PR #10, `0d2300f`) — paintWorkspaceCenter에 기업 리포트 붙여넣기 textarea 추가, `/api/learning/start` 페이로드에 `reportText`(선택) 추가, server → investLensService → coachService까지 전달 경로 연결. reportText 없으면 기존 fixture 경로 유지.

## 남은 것 — 우선순위 순서

**주의**: 아래 4번(데이터 파이프라인)을 1·2번보다 먼저 진행 중인 세션이 있음(2026-09-16 야간). 그 세션이 끝나면 **1·2번을 곧바로 다음 세션으로 이어서 할 것** — 순서만 바뀐 거고 우선순위가 낮아진 게 아님. 4번 세션이 `coachService.ts`의 `buildUserPrompt`를 많이 바꿀 수 있으니, 1·2번 세션 시작 전에 `if (marketFixture.status === "unverified_mock")` 체크가 여전히 남아있는지, 새 추출 파이프라인에도 "미검증/mock" 신호가 이어지는지 먼저 확인할 것.

### 1) investLensService.ts의 respond() 버그 2개 (blocking, PR #8 CodeRabbit 리뷰에서 발견 + 직접 코드 확인함)

- **과거 맥락 유실**: `respond()`가 `pastLearningContext: { recentSessions: [], lensStates: [], candidateStates: [] }`로 하드코딩(주석: `// 실제 구현 시 과거 맥락 주입 필요`). 첫 턴만 과거 학습 기록 참고하고 2턴째부터 코치가 기억을 잃음. `startLearningTurn`처럼 `buildPastLearningContext(existingSession.userId)`를 호출해서 넘길 것.
- **mock 데이터가 검증됨으로 둔갑**: 같은 함수에서 `marketFixture: { ..., status: "verified" }`로 무조건 고정. 원본 fixture가 `unverified_mock`이어도 2턴째부터 "검증됨"으로 취급됨. 세션 시작 시 사용한 원본 fixture의 실제 status를 유지해서 넘길 것 (필요하면 `LearningSession`에 원본 status 저장 필드 추가).
- 두 개 다 `respond()` 함수 안에서만 고치면 됨. 다른 파일 건드리지 말 것.

### 2) 완료 경로 blocking (세션 2 이후 계속 미해결, CodeRabbit도 독립적으로 동일 지적)

`paintWorkspaceRight`(app.js)는 `state.currentSession.readyToComplete === true`일 때만 판단/결정/완료 UI를 보여주는데, `readyToComplete`는 `coachService.ts`의 `!hasQuestion`으로 계산됨. `SKILL.md`가 "매 턴은 판단 질문으로 끝낸다"가 규칙이라 Solar가 스킬을 잘 따를수록 물음표가 계속 붙어서 `readyToComplete`가 거의 안 뜸(curl로 4턴 연속 검증, 계속 false). **지금 구조로는 라이브 화면에서 학습을 끝낼 방법이 없을 수 있음.**

해결: `readyToComplete` 신호에만 의존하지 말고, 사용자가 턴 수와 무관하게 언제든 누를 수 있는 "판단 정리하고 끝내기" 버튼/토글을 `paintWorkspaceRight`/`bindWorkspaceEvents`에 추가. `readyToComplete === true`가 오면 자동으로 그 UI를 보여주는 것도 유지하되 유일한 경로면 안 됨.

→ 위 1)과 2)는 같은 함수/화면 근처라 한 세션에 묶어서 시켜도 됨. 검증은 브라우저 말고 curl로 (respond 2번 이상 호출해서 프롬프트에 과거 맥락·미검증 경고 유지되는지 로그로 확인).

### 3) (낮은 우선순위) 후보 상태 추적 반쪽짜리

`memoryStore.ts`에 `upsertCandidateState`가 정의는 돼 있는데 어디서도 호출 안 됨 — 투자 후보 상태(더 공부/관찰/투자 후보/보류 등)가 실제로는 절대 저장 안 됨. 시간 남으면 `completeSessionWithSummary`에 후보 상태 저장 로직 추가. 지금 데모/제출엔 필수 아님.

### 4) 실제 데이터 파이프라인 (아직 미착수)

`MARKET_SCENE_FIXTURES`가 여전히 하드코딩된 NVIDIA/Tesla mock 장면. 리포트 텍스트를 붙여넣으면 투자 렌즈 관련 데이터만 추출하는 1단계 LLM 호출 → coachService 컨텍스트로 사용하는 2단계 구조로 대체. 시간 되면 진행, 안 되면 mock 상태로 제출 가능(단 위 1)의 "검증됨 둔갑" 버그는 반드시 고쳐야 mock임이 계속 사용자/코치에게 보임).

### 5) 통합 확인 + 제출 정리 (마지막)

`npm test` 통과 확인, `npm run web`으로 브라우저에서 테마 선택 → 학습 시작 → 답변 여러 번 → 판단 정리 → 완료까지 실제 클릭으로 끝까지 확인, README/제출 문서 정리.

## 참고: 세션 진행 시 주의

- 레거시 화면(`renderThemes`/`renderScene`/`renderLearning`/`renderDecision`/`startLearning`)은 `테마 기반 워크스페이스 구현`(2d4c513) 이전 코드로 지금 앱에서 도달 불가능한 죽은 코드. 실제 라이브 코드는 `renderWorkspace`/`paintWorkspaceRight`/`paintWorkspaceCenter`/`bindWorkspaceEvents`뿐. 레거시 화면은 계속 건드리지 말 것 (과거에 지시했는데도 위반한 적 있음 — diff로 직접 재확인할 것).
- `ORIGINAL_SKILL.md`는 계속 보존, 절대 수정 금지.
- 세션이 끝나고 "뭘 안 건드렸다"고 보고하는 내용은 그대로 믿지 말고 `git diff`로 직접 확인.

## 로그

### 2026-09-16 — 워크스페이스 리포트 텍스트 입력 경로 연결

- `src/services/investLensService.ts`: `PreparedSessionInput`에 `reportText?: string` 추가, `startLearningTurn`가 `callBeginnerStockCoach` 호출 시 전달.
- `src/web/server.ts`: `/api/learning/start` 요청 페이로드 파싱용 로컬 타입에 `reportText?: string` 추가, 파싱 값을 `input.reportText`로 전달해 `startLearningTurn`에 넘김.
- `src/web/app.js`: `paintWorkspaceCenter`에 textarea(`id="wsReportText"`) 추가, `bindWorkspaceEvents`의 `wsStartBtn` 클릭 핸들러에서 그 값을 `reportText`로 전송(비었으면 `undefined`).
- `npm test`(`tsc --noEmit && tsx goldenPath.test.ts`) 통과 확인.
- 서버 띄운 뒤 curl 비교: reportText 없음 → 기존 fixture 경로(`fixture.status: unverified_mock`, 시장 장면 기반 코치 응답); reportText 있음 → `extractInvestmentDataPool`이 리포트 텍스트를 실제 추출해 코치 응답에 반영(수치/컨센서스 직접 언급).
- 서버 프로세스 kill 후 ps/lsof로 포트 3000 리스닝 및 tsx 서버 프로세스 미잔류 확인.
- 레거시 화면(`renderThemes`/`renderScene`/`renderLearning`/`renderDecision`/`startLearning`) 미수정(diff로 확인).

- `src/services/sessionManager.ts`의 `createLearningSession()`에서 `session` 객체 생성 시 `fixtureStatus: input.fixtureStatus` 추가.
- `src/fixtures/seed.ts`의 세 시드 세션(tesla/vti/samsung) 각각에 `fixtureStatus: null` 추가 (과거 데이터라 원본 fixture 상태 모름).
- `npm test`(`tsc --noEmit && tsx goldenPath.test.ts`) 통과 확인. 다른 파일 미수정. handoff 갱신.

### 2026-09-16 — 데이터 파이프라인 1단계: 리포트 텍스트 → coachService 앞단 데이터 풀 추출 추가

- `src/coach/coachService.ts`만 수정. `extractInvestmentDataPool(reportText)` 추가: 기업 리포트 텍스트를 받아 actual/consensus, 성장률, 밸류에이션, 시장 반응/기대 요약, 확인 불가 항목만 구조화된 짧은 텍스트로 추출하는 1단계 Solar 호출.
- `buildUserPrompt`에 `dataPool?: string` 추가. 데이터 풀이 있으면 시장 장면/숫자 대신 그 풀만 컨텍스트로 사용하고, 없으면 기존 fixture 기반 동작을 그대로 유지.
- `callBeginnerStockCoach` 입력에 `reportText?: string` 추가. 값이 있으면 앞단에서 추출을 먼저 수행하고 그 결과만 `buildUserPrompt`에 전달.
- 실시간 크롤링/외부 검색 API는 연결하지 않음. 리포트 텍스트는 로컬 파일로 미리 준비된 것을 가정.
- 건드린 파일: `src/coach/coachService.ts`만. app.js, server.ts, fixtures, 테스트, 레거시 화면은 수정하지 않음.
- 다음 세션: 실제 리포트 텍스트를 `reportText`로 전달하는 경로를 server/api/프론트에서 붙이기. 지금은 추출 로직만 coachService 앞단에 장착된 상태.

### 2026-09-16 — 상태 재정리 (세션 번호 혼선 정리, CodeRabbit 리뷰 반영)

- PR #8 머지 완료 확인. SKILL.md 다이어트까지 "끝난 것"으로 이동.
- CodeRabbit이 PR #8에서 지적한 이슈 중 respond()의 과거 맥락 유실 / mock→verified 둔갑 버그를 직접 코드로 검증, "남은 것 1)"로 등록.
- 완료 경로 blocking 이슈는 세션 2 이후 계속 미해결 상태로 남아있음 — "남은 것 2)"로 유지.
- 다음 세션: "남은 것 1)+2)"를 investLensService.ts respond() + app.js paintWorkspaceRight 대상으로 한 세션에서 처리.

### 이전 세션 로그 (참고용, 아래는 과거 기록 그대로 보존)

- 세션 1: server.ts의 mockCoachTurn/mockCoachSummary import 제거, mock/real 배지 환경변수 연동(당시 조건 버그 있었음, 후속 수정됨), 콘솔 로깅. 타입 에러 정리(LearningSession import, readyToComplete 필드, MarketSceneFixture 중복 타입, seed.ts 필드, 죽은 server-coach-mock.ts 삭제)까지 `ce64d8b`로 커밋, npm test 통과.
- 세션 2: server.ts에 dotenv/config 추가 + serveFile 조건 수정(`aaa7115`). paintWorkspaceRight/bindWorkspaceEvents를 turns 기반 채팅 렌더링으로 재작성(`d3b85d1`). curl로 4턴 검증, readyToComplete 계속 false 발견.
- 세션 3~5 (SKILL.md 다이어트, 여러 차례): 편집 메모 삭제, "실제 시장 사용"+"데이터 검증 규칙" 통합, 중복 보조 규칙 제거, 후보 선정 이유·발화 예시 축소. 199줄→72줄, 핵심 3규칙·렌즈 4개는 유지. PR #8로 커밋 후 머지.
