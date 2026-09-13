## 구현 내용

- 테마 → 종목 탐색 데이터 구조 추가 (`src/domain/themes.ts`)
- market scene fixture 연결 추가 (`src/fixtures/marketSceneFixtures.ts`)
- 과거 학습 맥락 조회 (`src/services/learningContextBuilder.ts`)
- 학습 세션 생성/완료 (`src/services/sessionManager.ts`)
- beginner-stock-coach Skill 프롬프트 주입 후 Solar 호출 (`src/coach/coachService.ts`)
- 사용자 판단/결정 전달 → coach 요약 → 세션 저장
- 이후 세션에서 이전 학습 재연결 검증
- TypeScript 타입 오류 수정 및 `tsconfig.json` 추가
- 테스트 스크립트 설정 (`npm test`: `npx tsc --noEmit && npx tsx src/tests/goldenPath.test.ts`)
- Golden Path 검증용 CLI/테스트 (`src/cli/index.ts`, `src/tests/goldenPath.test.ts`)
- 학습 흐름 서비스 인터페이스 분리 (`src/services/investLensService.ts`)

## 실행 흐름

1. 사용자가 테마를 선택한다.
2. 해당 테마에 연결된 종목을 선택한다.
3. 선택된 종목의 market scene fixture를 조회한다.
4. 과거 학습 맥락을 조회한다.
5. 학습 세션을 생성한다.
6. beginner-stock-coach를 호출한다.
7. 사용자 판단/결정을 전달한다.
8. coach 요약 결과를 받아 세션을 저장한다.
9. 이후 세션에서 이전 학습 기록을 다시 연결한다.

## 테스트 방법

```bash
npx tsc --noEmit
npx tsx src/tests/goldenPath.test.ts
```

또는

```bash
npm test
```

## fixture / mock 명시

- `MARKET_SCENE_FIXTURES`는 현재 `unverified_mock` 상태다.
- 실제 사용자/심사 데모에서는 검증된 장면과 숫자로 교체해야 한다.
- seed 세션(Tesla/VTI/Samsung)은 과거 학습 맥락용 데모 데이터다.

## 아직 구현하지 않은 부분

- UI
- 실시간 시장 데이터 연동
- 실제 Solar API 키 미설정 시 coach 호출 단계만 실패

## 참고

- Hermes 프로젝트-local Skill은 개발 검증용이며, 실제 사용자 요청은 `coachService`를 통해 Solar API 호출 방식으로 처리한다.
- `SKILL_MD_PATH`는 `.hermes/skills/beginner-stock-coach/SKILL.md`로 수정했다.
- 기존 `beginner-stock-coach`의 핵심 코칭 로직은 애플리케이션에 중복 구현하지 않고, 현재 상황/과거 맥락을 Skill에 전달하는 방식으로 사용한다.
