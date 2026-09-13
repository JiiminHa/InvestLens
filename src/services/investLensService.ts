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
  coachCall: CoachTurnCall = callBeginnerStockCoach
): Promise<LearningTurnResult> {
  const session = createLearningSession({
    userId: input.userId,
    companyId: input.companyId,
    market_scene: input.marketScene,
    market_numbers: input.marketNumbers,
  });

  let turnResponse;
  try {
    turnResponse = await coachCall({
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
  coachSummaryCall: CoachSummaryCall = callBeginnerStockCoachSummary
): Promise<LearningCompletionResult> {
  const existingSession = getSessionById(sessionId);
  if (!existingSession) {
    throw new Error(`completeLearning: 세션을 찾을 수 없습니다. sessionId=${sessionId}`);
  }

  const summaryResponse = await coachSummaryCall(
    {
      session: existingSession,
      pastLearningContext: pastContext,
      marketFixture: fixture,
    },
    userJudgment,
    userDecision
  );

  const allowedPastSessionIds = new Set(pastContext.recentSessions.map((s) => s.sessionId));
  const filteredRelatedPastLearning = summaryResponse.summary.relatedPastLearning.filter((r) =>
    allowedPastSessionIds.has(r.sessionId)
  );

  // 사용자 판단을 우선 반영
  const overriddenSummary: import("../domain/types").SessionSummary = {
    ...summaryResponse.summary,
    judgment: userJudgment,
    decisionAction: userDecision,
    relatedPastLearning: filteredRelatedPastLearning,
  };

  const completed = completeSessionWithSummary(
    sessionId,
    overriddenSummary,
    filteredRelatedPastLearning.map((r) => r.sessionId)
  );

  return {
    session: completed,
    summary: overriddenSummary,
    finalMessage: summaryResponse.finalMessage,
  };
}
