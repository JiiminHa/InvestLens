# InvestLens 개발 지침

## Git Workflow

의미 있는 변경은 다음 순서로 진행한다.

Issue → Branch → Commit → Pull Request → Review → Merge

- `main` 브랜치에서 직접 기능을 개발하지 않는다.
- 기능 추가, 버그 수정, 리팩터링, 구조 변경 전에는 GitHub Issue를 생성한다.
- 하나의 Issue와 PR에는 하나의 명확한 목적만 담는다.
- Issue 생성 후 작업 브랜치를 만든다.
- 브랜치명은 작업 종류와 Issue 번호를 포함한다.
  - `feat/3-learning-context`
  - `fix/4-session-storage`
  - `refactor/5-coach-service`
  - `docs/6-skill-mapping`
- Commit은 변경 목적 단위로 나눈다.
- Conventional Commits 형식을 우선 사용한다.
- PR은 관련 Issue를 연결한다.
- 사용자가 리뷰하기 전 PR을 임의로 merge하지 않는다.
- 단순 오탈자 등 매우 작은 변경은 Issue 생성을 생략할 수 있다.

### Commit

- 커밋 메시지는 Conventional Commits 형식을 사용한다.
- 커밋 타입은 영어로, 설명은 한국어로 작성한다.
- 형식: `<type>: <한국어 설명>`
- 변경 목적 단위로 커밋한다.
- 서로 관련 없는 변경사항을 하나의 커밋에 포함하지 않는다.

예시:

- `feat: 과거 학습 맥락 연결`
- `fix: 학습 완료 시 lens 상태 저장 오류 수정`
- `refactor: 시드 데이터를 fixtures로 분리`
- `docs: Skill 매핑 문서 추가`
- `test: Golden Path 테스트 추가`
- `chore: GitHub 이슈 및 PR 템플릿 설정`

## 프로젝트 핵심 구조

InvestLens는 초보 투자자가 실제 시장 상황을 통해 투자 개념을 학습하고,
과거에 배운 투자 관점을 새로운 기업과 시장 상황에 다시 적용할 수 있도록 돕는
AI 투자 학습 에이전트다.

핵심은 종목 추천이 아니라
사용자의 학습과 판단 경험을 축적하고 다시 활용하는 것이다.

## Core Skill

핵심 Hermes Skill은 다음 위치에 있다.

`.hermes/skills/beginner-stock-coach/SKILL.md`

- `beginner-stock-coach`의 핵심 코칭 로직을 애플리케이션 코드에 중복 구현하지 않는다.
- 애플리케이션은 현재 시장 상황과 과거 학습 맥락을 Skill에 제공한다.
- 어떤 투자 관점(lens)을 사용할지 또는 재사용할지는 Skill이 결정한다.
- 애플리케이션에서 특정 lens를 미리 선택하지 않는다.
- 예선 Skill의 핵심 동작을 임의로 변경하거나 우회하지 않는다.

## Skill 변경

결선 서비스화를 위해 `beginner-stock-coach`를 수정하거나 확장할 경우:

1. 기존 Skill의 핵심 역할을 유지한다.
2. 서비스에 필요한 최소한의 변경만 한다.
3. 변경 이유와 내용을 Skill Mapping 문서에 기록한다.
4. 예선 제출 원본은 별도로 보존한다.

## 개발 원칙

- 5~6일 내 완성해야 하는 MVP라는 점을 우선한다.
- 불필요한 추상화와 과도한 설계를 피한다.
- 하나의 완전한 Golden Path가 실제로 동작하는 것을 우선한다.
- 현재 MVP에 필요하지 않은 기능을 미리 구현하지 않는다.
- mock 데이터와 실제 데이터를 명확하게 구분한다.
- 검증되지 않은 시장 수치나 정보를 실제 데이터처럼 사용하지 않는다.

## 보안

- `.env`를 Git에 commit하지 않는다.
- API Key, Access Token 등 비밀정보를 코드에 작성하지 않는다.
- 비밀값을 출력하거나 로그에 남기지 않는다.
- credential 파일에서 실제 비밀값을 읽거나 검색하지 않는다.
- 환경변수는 값이 아니라 존재 여부만 확인한다.
- `.env.example`에는 실제 값 없이 환경변수 이름만 작성한다.
