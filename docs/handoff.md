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
