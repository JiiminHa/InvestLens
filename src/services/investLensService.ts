import { PastLearningContext } from "../domain/types";
import { MarketSceneFixture } from "../fixtures/marketSceneFixtures";
import {
  createLearningSession,
  completeSessionWithSummary,
  getSessionById,
  saveSession,
} from "./sessionManager";
import { callBeginnerStockCoach, callBeginnerStockCoachSummary } from "../coach/coachService";

export interface PreparedSessionInput {
  userId: string;
  companyId: import("../domain/types").CompanyId;
  marketScene: string;
  marketNumbers: string;
  pastContext: PastLearningContext;
  fixture: MarketSceneFixture;
}

export interface LearningTurnResult {
  session: import("../domain/types").LearningSession;
  coachMessage: string;
  isQuestionTurn: boolean;
}

export interface LearningCompletionResult {
  session: import("../domain/types").LearningSession;
  summary: import("../domain/types").SessionSummary;
  finalMessage: string;
}

export type CoachTurnCall = typeof callBeginnerStockCoach;
export type CoachSummaryCall = typeof callBeginnerStockCoachSummary;

export async function startLearningTurn(
  input: PreparedSessionInput,
  coachCall?: CoachTurnCall
): Promise<LearningTurnResult> {
  const session = createLearningSession({
    userId: input.userId,
    companyId: input.companyId,
    market_scene: input.marketScene,
    market_numbers: input.marketNumbers,
  });

  const effectiveCoachCall = coachCall ?? callBeginnerStockCoach;

  let turnResponse;
  try {
    turnResponse = await effectiveCoachCall({
      session,
      pastLearningContext: input.pastContext,
      marketFixture: input.fixture,
    });
  } catch (error) {
    saveSession({
      ...session,
      status: "failed",
      endedAt: new Date().toISOString(),
    });
    throw error;
  }

  return {
    session,
    coachMessage: turnResponse.message,
    isQuestionTurn: turnResponse.isQuestionTurn,
  };
}

export async function completeLearning(
  sessionId: string,
  pastContext: PastLearningContext,
  fixture: MarketSceneFixture,
  userJudgment: string,
  userDecision: import("../domain/types").DecisionAction,
  coachSummaryCall?: CoachSummaryCall
): Promise<LearningCompletionResult> {
  const existingSession = getSessionById(sessionId);
  if (!existingSession) {
    throw new Error(`completeLearning: 세션을 찾을 수 없습니다. sessionId=${sessionId}`);
  }

  let summaryResponse;
  try {
    const effectiveCoachSummaryCall = coachSummaryCall ?? callBeginnerStockCoachSummary;
    summaryResponse = await effectiveCoachSummaryCall(
      {
        session: existingSession,
        pastLearningContext: pastContext,
        marketFixture: fixture,
      },
      userJudgment,
      userDecision
    );
  } catch (error) {
    saveSession({
      ...existingSession,
      status: "failed",
      endedAt: new Date().toISOString(),
    });
    throw error;
  }

  const allowedPastSessionIds = new Set(pastContext.recentSessions.map((s) => s.sessionId));
  const filteredRelatedPastLearning = summaryResponse.summary.relatedPastLearning.filter(
    (r) => allowedPastSessionIds.has(r.sessionId)
  );

  const overriddenSummary: import("../domain/types").SessionSummary = {
    ...summaryResponse.summary,
    judgment: userJudgment,
    decisionAction: userDecision,
    relatedPastLearning: filteredRelatedPastLearning,
  };

  const coachLensName = overriddenSummary.lensName;
  const finalMessage =
    "정리하면, 이번 " +
    existingSession.companyId +
    " 장면은 " +
    fixture.scene +
    "\n\n" +
    "사용한 렌즈: " +
    coachLensName +
    "\n" +
    "판단: " +
    overriddenSummary.judgment +
    "\n" +
    "결정: " +
    overriddenSummary.decisionAction +
    "\n\n" +
    "과거 학습에서 다룬 \"" +
    coachLensName +
    "\"을 이번 장면에도 적용할 수 있는지 확인했다.\n" +
    "다음 학습으로 넘어가기 전에, 투자 일지와 knowledge graph에서 이 연결을 확인해 보라.";

  const completed = completeSessionWithSummary(
    sessionId,
    overriddenSummary,
    filteredRelatedPastLearning.map((r) => r.sessionId)
  );

  return {
    session: completed,
    summary: overriddenSummary,
    finalMessage,
  };
}
