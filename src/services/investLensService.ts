import { PastLearningContext } from "../domain/types";
import { MarketSceneFixture } from "../fixtures/marketSceneFixtures";
import { createLearningSession, completeSessionWithSummary } from "./sessionManager";
import { callBeginnerStockCoach, callBeginnerStockCoachSummary } from "../coach/coachService";

export interface PreparedSessionInput {
  userId: string;
  companyId: string;
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

export async function startLearningTurn(input: PreparedSessionInput): Promise<LearningTurnResult> {
  const session = createLearningSession({
    userId: input.userId,
    companyId: input.companyId,
    market_scene: input.marketScene,
    market_numbers: input.marketNumbers,
  });

  const turnResponse = await callBeginnerStockCoach({
    session,
    pastLearningContext: input.pastContext,
    marketFixture: input.fixture,
  });

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
  userDecision: import("../domain/types").DecisionAction
): Promise<LearningCompletionResult> {
  const session = createLearningSession({
    userId: "tmp",
    companyId: fixture.companyId,
    market_scene: fixture.scene,
    market_numbers: fixture.numbers,
  });

  const summaryResponse = await callBeginnerStockCoachSummary(
    {
      session,
      pastLearningContext: pastContext,
      marketFixture: fixture,
    },
    userJudgment,
    userDecision
  );

  const completed = completeSessionWithSummary(
    sessionId,
    summaryResponse.summary,
    summaryResponse.summary.relatedPastLearning.map((r) => r.sessionId)
  );

  return {
    session: completed,
    summary: summaryResponse.summary,
    finalMessage: summaryResponse.finalMessage,
  };
}
