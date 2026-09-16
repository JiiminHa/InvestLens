# Handoff

세션 시작 시 이 문서를 먼저 읽는다. 세션 종료 시 "이번에 뭘 바꿨는지 / 다음 세션이 뭘 해야 하는지"를 5줄 이내로 아래 로그에 추가한다. 위에서부터 최신순으로 쌓는다.

## 끝난 것

1. 테마 전환 시 reportUsed 초기화 누락 수정 (`dbc0aa8`) — `data-ws-theme` 클릭 핸들러에서 `state.fixture = null;` 아래 `state.reportUsed = false;` 추가. 리포트로 학습한 뒤 다른 테마를 골라도 reportUsed가 true로 남아 mock 안내가 계속 숨겨지던 문제 해결. 3파일 변경, 22줄 추가, npm test 통과 확인 후 커밋.
2. 로깅 + 죽은 코드 정리 (`ce64d8b`) — mock import 제거, 콘솔 로깅, 타입 에러 정리, golden path 통과
3. 서버 dotenv/serveFile 버그 수정 (`aaa7115`) — `.env`의 `UPSTAGE_API_KEY` 실제 로드, mock/real 배지 정상 표시
4. 코치 패널 멀티턴 채팅 UI (`d3b85d1`) — `paintWorkspaceRight`/`bindWorkspaceEvents`가 `state.currentSession.turns` 기반으로 렌더링, `/api/learning/respond` 연동. curl로 다턴 검증 완료
5. SKILL.md 다이어트 (PR #8, `d33e9ff`, 머지됨) — 199줄→72줄, 핵심 3규칙(한 턴 작게/렌즈 하나만/상태 내부 누적)과 렌즈 4개 예시는 유지, 중복 섹션·예시·편집 메모 제거
6. 워크스페이스 리포트 텍스트 입력 경로 연결 (PR #10, `0d2300f`) — paintWorkspaceCenter에 기업 리포트 붙여넣기 textarea 추가, `/api/learning/start` 페이로드에 `reportText`(선택) 추가, server → investLensService → coachService까지 전달 경로 연결. reportText 없으면 기존 fixture 경로 유지.
7. `respond()` 과거 맥락·미검증 유지 버그 수정 (`7f67572`) — 2턴째부터 과거 학습 기록이 사라지고 mock fixture가 "검증됨"으로 둔갑하던 문제 해결. `buildPastLearningContext` 주입 + `fixtureStatus` 보존.
8. 완료 경로 해제 (`d3b85d1`/`f7b5c83`) — "판단 정리하고 끝내기" 토글이 `readyToComplete`와 무관하게 항상 노출되어, 코치가 계속 질문을 던져도 사용자가 언제든 학습을 끝낼 수 있음.
9. 리포트 입력 시 mock 표시 정합성 (PR #11, `dbc0aa8`+`b7fa15b`) — dataPool이 있으면 "미검증 목업" 경고를 프롬프트에 넣지 않고, 화면의 mock 안내도 숨김. 학습 시작 성공 후에만 `reportUsed`를 설정.
10. 데이터 풀을 세션 전체에 유지 + 완료 요약 반영 — 추출을 `investLensService`로 올려 세션당 1회만 수행하고 세션에 저장, `respond()`/`completeLearning()`이 재추출 없이 재사용. 완료 요약의 `finalMessage`도 mock 문장 대신 리포트 데이터를 사용. curl로 전 구간 검증 완료.

## 남은 것 — 우선순위 순서

### 1) (낮은 우선순위) 후보 상태 추적 반쪽짜리

`memoryStore.ts`에 `upsertCandidateState`가 정의는 돼 있는데 어디서도 호출 안 됨 — 투자 후보 상태(더 공부/관찰/투자 후보/보류 등)가 실제로는 절대 저장 안 됨. 시간 남으면 `completeSessionWithSummary`에 후보 상태 저장 로직 추가. 지금 데모/제출엔 필수 아님.

### 2) 통합 확인 + 제출 정리 (다음 세션, 마지막)

`npm test` 통과 확인. `npm run web`으로 브라우저에서 실제 클릭으로 두 경우 모두 완주 확인:
(a) 리포트 없이 — 테마 선택 → 학습 시작 → 답변 2회 → 판단 정리하고 끝내기 → 저장 후 학습 완료 → 완료 요약,
(b) 리포트 붙여넣고 — 같은 흐름에서 mock 안내가 사라지고 완료 요약에 리포트 숫자가 들어가는지 확인.
그 뒤 README 정리(실행 방법, 구현 범위, 알려진 한계).

## 참고: 세션 진행 시 주의

- 레거시 화면(`renderThemes`/`renderScene`/`renderLearning`/`renderDecision`/`startLearning`)은 `테마 기반 워크스페이스 구현`(2d4c513) 이전 코드로 지금 앱에서 도달 불가능한 죽은 코드. 실제 라이브 코드는 `renderWorkspace`/`paintWorkspaceRight`/`paintWorkspaceCenter`/`bindWorkspaceEvents`뿐. 레거시 화면은 계속 건드리지 말 것 (과거에 지시했는데도 위반한 적 있음 — diff로 직접 재확인할 것).
- `ORIGINAL_SKILL.md`는 계속 보존, 절대 수정 금지.
- 세션이 끝나고 "뭘 안 건드렸다"고 보고하는 내용은 그대로 믿지 말고 `git diff`로 직접 확인.

## 로그

### 2026-09-16 — 리포트 데이터 풀을 세션 전체에 유지 — 완료 요약까지 반영

- `src/coach/coachService.ts`: `buildSummaryUserPrompt`에서 dataPool이 있으면 "- 시장 장면: ..." 줄을 빼고 데이터 풀 섹션만 유지. `callBeginnerStockCoachSummary`의 finalMessage를 dataPool 기준 분기 — 있으면 "정리하면, 이번 {companyId} 장면은 사용자가 제공한 리포트에서 추출한 아래 데이터를 기준으로 봤다.\n" + dataPool, 없으면 기존 mock 장면 문장 유지.
- `src/services/investLensService.ts`: `completeLearning`의 finalMessage도 `existingSession.dataPool` 기준으로 동일 분기 처리. 두 파일의 완료 문구를 동일한 문장으로 맞춤.
- `docs/handoff.md`: 끝난 것 목록 번호 중복(1,2,2,3...)을 1~6으로 재정렬, "데이터 파이프라인 1단계" 제목 아래 섞인 항목을 끝난 것/로그로 분리, 로그 내 일본어("세션 생성せず" → "세션을 생성하지 않고") 수정, 이번 작업 로그 추가.
- npm test 통과, 서버 재시작 후 curl 검증: reportText 있는 완료 응답 finalMessage에 mock 문장("데이터센터와 AI 관련 매출 기대가 크게 강조되고") 미포함 및 리포트 숫자 확인, reportText 없는 경우 기존 장면 문장 유지 회귀 확인.

### 2026-09-16 — 데이터 풀 지속성: 추출 위치를 investLensService로 이동, 세션당 1회 추출 보장

- `src/domain/types.ts`: LearningSession에 `dataPool?: string | null` 추가 (옵셔널로 seed.ts 수정 불필요).
- `src/services/sessionManager.ts`: `CreateSessionInput`에 `dataPool` 추가, `createLearningSession`이 세션 생성 시 함께 저장.
- `src/coach/coachService.ts`: `extractInvestmentDataPool`을 export, `callBeginnerStockCoach`에서 `reportText?: string` 제거 후 `dataPool?: string` 입력만 받아 `buildUserPrompt`에 전달. `callBeginnerStockCoachSummary`에도 `dataPool` 추가, 요약 프롬프트에 "리포트에서 추출한 데이터 풀" 섹션으로 포함.
- `src/services/investLensService.ts`: `startLearningTurn`이 (a) `reportText` 있으면 `extractInvestmentDataPool` 1회 호출 → (b) 결과를 `createLearningSession` 입력으로 세션 생성과 동시에 저장 → (c) 같은 `dataPool`을 `coachCall`에 전달. `respond()`와 `completeLearning()`은 `existingSession.dataPool`을 그대로 coach/summary 호출에 전달, 재추출 없음. 추출 실패 시 세션을 생성하지 않고 에러 전파.
- `npm test` 통과. 서버 재시작 후 curl 검증: start(reportText 있음)→respond 2회 연속에서 "리포트 데이터 추출 시작"이 Solar 호출 기준으로 정확히 1회만 발생, respond 2회차 프롬프트에도 데이터 풀(Tesla Q4 2024 수치 등) 포함 확인. 회귀: reportText 없이 start → 응답에 "검증용 목업 데이터" 문구 유지, "데이터 포인트 풀(추출 결과)" 미언급 → extract 미호출 확인.
- 수정 파일 5개(`types.ts`, `sessionManager.ts`, `coachService.ts`, `investLensService.ts`, `handoff.md`)만 변경. app.js/styles.css/server.ts/seed.ts/SKILL.md/ORIGINAL_SKILL.md 및 레거시 함수 미수정(diff 확인).

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
