// MVP mock coach 구현
// server.ts가 실제 coachService 대신 사용하는 학습 턴/요약 mock
// Golden Path 테스트와 동일한 응답을 제공하도록 설계
// 과거 학습 연결 판단은 mock이 직접 수행하고, core가 실제 세션 존재 여부만 검증

import type {
  LearningSession,
  PastLearningContext,
  SessionSummary,
  DecisionAction,
} from "../domain/types";
import type { MarketSceneFixture } from "../fixtures/marketSceneFixtures";
import type { CoachTurnCall, CoachSummaryCall } from "../services/investLensService";
import { companyName } from "../domain/constants";

/**
 * 학습 턴 시작 시 코치 첫 메시지 반환 (mock)
 * Golden Path 테스트의 mockCallBeginnerStockCoach와 동일한 동작.
 */
export const mockCoachTurn: CoachTurnCall = async (
  input: {
    session: LearningSession;
    pastLearningContext: PastLearningContext;
    marketFixture: MarketSceneFixture;
  }
): Promise<{ message: string; isQuestionTurn: boolean }> => {
  const companyNameValue = companyName(input.marketFixture.companyId);

  return {
    message:
      `${companyNameValue}의 최근 장면에서 중요한 건 기대 vs 실제입니다. 시장 기대가 실제 실적·가이드라인보다 앞서 있을 수 있는지 생각해 보세요. 지금 이 장면에서 먼저 보이는 신호는 무엇인가요?`,
    isQuestionTurn: true,
  };
};

/**
 * 학습 완료 시 summary + finalMessage 반환 (mock)
 * Golden Path 테스트의 mockCallBeginnerStockCoachSummary와 동일한 동작.
 *
 * 과거 학습 연결 판단:
 * - mock이 직접 pastLearningContext.recentSessions에서 현재 선택한 lens와
 *   coachLensUsedId가 같은 가장 최근 세션을 찾는다.
 * - 일치하는 세션이 있으면 실제 sessionId, lensName을 사용해 relatedPastLearning 한 건 반환.
 * - 일치하는 세션이 없으면 빈 배열 반환.
 * - 존재하지 않는 연결이나 임의의 세션 ID는 생성하지 않음.
 * - core(investLensService)는 반환된 relatedPastLearning 중 실제 pastContext.recentSessions에
 *   존재하는 세션만 필터링하여 최종 반영.
 */
export const mockCoachSummary: CoachSummaryCall = async (
  input: {
    session: LearningSession;
    pastLearningContext: PastLearningContext;
    marketFixture: MarketSceneFixture;
  },
  userJudgment: string,
  userDecision: DecisionAction
): Promise<{ summary: SessionSummary; finalMessage: string }> => {
  const lensName = "기대 vs 실제";
  const coachLensUsedId: "expect_vs_actual" = "expect_vs_actual";

  // 과거 학습 맥선에서 같은 lens를 사용한 가장 최근 세션 찾기
  const relatedSession = input.pastLearningContext.recentSessions.find(
    (s) => s.coachLensUsedId === coachLensUsedId
  );

  const relatedPastLearning: SessionSummary["relatedPastLearning"] =
    relatedSession
      ? [
          {
            sessionId: relatedSession.sessionId,
            lensName: relatedSession.lensName,
            relevance: "같은 투자 렌즈를 이전 시장 장면에 적용한 학습",
          },
        ]
      : [];

  const summary: SessionSummary = {
    coachLensUsedId,
    lensName,
    lensStatusAfter: "적용해봄",
    decisionAction: userDecision,
    judgment: userJudgment,
    relatedPastLearning,
  };

  const reconnectionMessage = relatedSession
    ? `과거 ${relatedSession.companyName} 학습에서 사용한 "${relatedSession.lensName}" 렌즈를 이번 장면에도 다시 적용했습니다.`
    : "이번 학습과 직접 연결된 과거 학습 기록은 없습니다.";

  const finalMessage =
    "정리하면, 이번 " +
    input.marketFixture.companyId +
    " 장면은 " +
    input.marketFixture.scene +
    "\n\n" +
    "사용한 렌즈: " +
    lensName +
    "\n" +
    "판단: " +
    userJudgment +
    "\n" +
    "결정: " +
    userDecision +
    "\n\n" +
    "과거 학습에서 다룬 \"" +
    lensName +
    "\"을 이번 장면에도 적용할 수 있는지 확인했다.\n" +
    reconnectionMessage +
    "\n다음 학습으로 넘어가기 전에, 투자 일지와 knowledge graph에서 이 연결을 확인해 보라.";

  return { summary, finalMessage };
};
