# Handoff

세션 시작 시 이 문서를 먼저 읽는다. 세션 종료 시 "이번에 뭘 바꿨는지 / 다음 세션이 뭘 해야 하는지"를 5줄 이내로 아래 로그에 추가한다. 위에서부터 최신순으로 쌓는다.

## 현재 우선순위 (세션 분할 계획)

1. 로깅 + 죽은 코드 정리 — 완료 (ce64d8b, npm test 통과, dotenv/배지 버그도 수정 확인됨)
2. 코치 화면 멀티턴 채팅화 — 구조는 완료, 아래 "다음 할 일"의 blocking 이슈 먼저 해결
3. SKILL.md 다이어트 (ORIGINAL_SKILL.md는 보존, SKILL.md만 축소)
4. 실제 데이터 파이프라인 (리포트 텍스트 → 렌즈 관련 데이터 추출 → coachService 컨텍스트로 사용, fixture 하드코딩 대체)
5. 통합 확인 + 제출 정리

## 다음 할 일 (PR 전 필수, blocking)

`paintWorkspaceRight`(app.js)는 `state.currentSession.readyToComplete === true`일 때만 판단/결정/완료 UI를 보여주는데, `readyToComplete`는 `coachService.ts`의 `!hasQuestion`으로 계산된다. 근데 `SKILL.md`는 "매 턴은 판단 질문으로 끝낸다"가 규칙이라 Solar가 스킬을 잘 따를수록 물음표가 계속 붙는다. curl로 직접 respond를 4번 연속 호출해서 검증했는데 4턴 내내 `readyToComplete: false`였다 — **지금 구조로는 라이브 화면에서 학습을 끝낼 방법이 없을 수 있다.**

해결: `readyToComplete` 신호에만 의존하지 말고, 사용자가 턴 수와 무관하게 언제든 누를 수 있는 "판단 정리하고 끝내기" 버튼/토글을 추가해서 `wsJudgment`/`wsDecisions`/`wsCompleteBtn` UI를 노출할 것. `readyToComplete === true`가 오면 자동으로 그 UI를 보여주는 것도 유지하되, 그게 유일한 경로면 안 된다.

## 참고: 세션 진행 시 주의

- 레거시 화면(`renderThemes`/`renderScene`/`renderLearning`/`renderDecision`/`startLearning`)은 `테마 기반 워크스페이스 구현`(2d4c513) 이전 코드로, 지금 앱에서 `state.screen`이 `"workspace"`로 시작하고 거기서 이 화면들로 넘어가는 진입점이 없어 도달 불가능하다. 실제 라이브 코드는 `renderWorkspace`/`paintWorkspaceRight`/`paintWorkspaceCenter`/`bindWorkspaceEvents`뿐이다. 레거시 화면은 계속 건드리지 말 것(과거에 지시했는데도 위반한 적 있음 — diff로 직접 확인해서 재확인할 것).
- 세션이 끝나고 "뭘 안 건드렸다"고 보고하는 내용은 그대로 믿지 말고 `git diff`로 직접 확인한다.

## 로그

### 2026-09-16 — 세션 2: 서버 잔여 버그 수정 + 코치 패널 멀티턴 채팅화 (ce64d8b 이후, 커밋 전)

- `server.ts`에 `import "dotenv/config"` 추가, `serveFile`의 `path === "index.html"`을 `path.endsWith("index.html")`로 수정 — `__COACH_ENV="real"` 정상 주입 curl로 확인.
- `paintWorkspaceRight`/`bindWorkspaceEvents`(app.js, 라이브 경로)를 `state.currentSession.turns` 기반 채팅 렌더링 + `/api/learning/respond` 연동으로 재작성. CSS에 `.ws-chat-*` 클래스 추가.
- curl로 start→respond 4턴 직접 검증: 실제 Solar 응답, turns 누적 정상 동작. 단 `readyToComplete`가 4턴 내내 false — 위 "다음 할 일" 참고.
- 레거시 화면(`renderLearning` 등)도 같이 수정됐는데 지시 위반이었음. 기능엔 영향 없음(죽은 코드).
- 다음 세션: "다음 할 일" 항목(완료 도달 경로) 해결 후 `npm run web`으로 브라우저에서 테마 선택 → 학습 시작 → 답변 여러 번 → 판단 정리 → 완료까지 끝까지 확인하고 PR.

### 2026-09-16 — 세션 1: 로깅 + 죽은 코드 정리

- server.ts의 `mockCoachTurn`/`mockCoachSummary` import 제거, mock/real 배지 환경변수 연동(당시엔 조건 버그 있었음, 세션 2에서 수정됨), 콘솔 로깅 추가.
- 이후 타입 에러 정리(LearningSession import, readyToComplete 필드, MarketSceneFixture 중복 타입, seed.ts 필드, 죽은 server-coach-mock.ts 삭제)까지 ce64d8b로 커밋 완료, npm test 통과.


### 2026-09-16 — 세션 5: SKILL.md 중복/반복 정리 + 커밋·PR

- 1번: 73번째 줄 편집 메모 삭제(0 리스크).
- 2번: "실제 시장 사용" + "데이터 검증 규칙 (내부 작업)" 두 섹션을 "숫자 사용 규칙" 하나로 합침. 사용자 대상 숫자·출처 규칙과 내부 검증 규칙을 한 곳에 모으고, "기대 vs 실제에서 actual/consensus 기준 명확한 장면 우선" 디테일은 남김.
- 3번: 17번째 줄 보조 규칙에서 "초보 여부 가늠되면 렌즈 하나만" 부분 삭제, 28번째 줄 "첫 장면에서는 렌즈 하나만"으로 통일. 사용자 관찰 관련 한 턴 렌즈 여러 개 금지 문장만 보조 규칙에 남김.
- 4번: "기업/후보 다루기"에서 사용자 발화 예시를 3개→1개("오늘 뭐 살까?")로 축소, 후보 선정 이유 5개→4개(실적·기대 차이와 시장 강한 반응을 한 묶음으로 통합). 마지막 "유명 기업이라는 이유만으로 고르지 않는다"는 유지.
- 결과적으로 77줄 9,396바이트 → 72줄 9,036바이트. 핵심 3규칙과 렌즈 4개 예시는 그대로.
- 커밋 후 PR 생성.

### 2026-09-16 — 세션 3: SKILL.md 다이어트

- `완전 초보에게는 렌즈를 여러 개 주지 않는다` 문장을 "초보 여부를 세션 초반에 가늠할 수 있으면 렌즈를 한 번에 하나만 제시하고, 판단이 서지 않으면 하나로 시작한다"로 대체. 초보 여부 판단 근거가 없다는 지적을 반영.
- 투자 렌즈 8개 → 4개로 축소 (기대 vs 실제, 좋은 회사 vs 좋은 주식, 집중 노출 vs 분산 노출, 리스크 = 내 투자 논리를 깨뜨리는 조건). 나머지 4개(차익거래, 모멘텀, 테마/사이클, 산업 구조, 매출/이익 성장 등)는 예시에서 제거.
- "학습 방식"과 "하지 말 것"에서 겹치는 지시 통합: "한 턴에 여러 과제를 한꺼번에 던지지 않는다"를 핵심 규칙 1번으로 흡수하고 양쪽에서 중복 제거. "완전 초보에게 렌즈 여러 개"도 보조 규칙으로 통합.
- 전체 길이를 기존 대비 약 93% 수준으로 축소(목표 60%에는 못 미침 — 더 줄이면 핵심 디테일 손실이 커서 여기서 중단).
