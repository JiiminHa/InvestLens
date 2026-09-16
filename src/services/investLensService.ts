import { PastLearningContext, LearningSession } from "../domain/types";
import { MarketSceneFixture } from "../fixtures/marketSceneFixtures";
import {
  createLearningSession,
  completeSessionWithSummary,
  getSessionById,
  saveSession,
} from "./sessionManager";
import { callBeginnerStockCoach, callBeginnerStockCoachSummary } from "../coach/coachService";
import { buildPastLearningContext } from "../services/learningContextBuilder";

export interface PreparedSessionInput {
  userId: string;
  companyId: import("../domain/types").CompanyId;
  marketScene: string;
  marketNumbers: string;
  pastContext: PastLearningContext;
  fixture: MarketSceneFixture;
  reportText?: string;
}

export interface LearningTurnResult {
  session: import("../domain/types").LearningSession;
  coachMessage: string;
  isQuestionTurn: boolean;
}

export interface RespondResult {
  session: import("../domain/types").LearningSession;
  coachMessage: string;
  isQuestionTurn: boolean;
  readyToComplete: boolean;
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
  console.log("[investLensService] startLearningTurn 시작 — userId=" + input.userId + " companyId=" + input.companyId);
  const session = createLearningSession({
    userId: input.userId,
    companyId: input.companyId,
    marketScene: input.marketScene,
    marketNumbers: input.marketNumbers,
    fixtureStatus: input.fixture.status,
  });

  const effectiveCoachCall = coachCall ?? callBeginnerStockCoach;

  let turnResponse;
  try {
    turnResponse = await effectiveCoachCall({
      session,
      pastLearningContext: input.pastContext,
      marketFixture: input.fixture,
      reportText: input.reportText,
    });
  } catch (error) {
    saveSession({
      ...session,
      status: "failed",
      endedAt: new Date().toISOString(),
    });
    throw error;
  }

  const firstTurn: LearningSession["turns"][0] = {
    role: "coach",
    content: turnResponse.message,
    createdAt: new Date().toISOString(),
  };

  saveSession({
    ...session,
    turns: [firstTurn],
    phase: "question",
  });

  return {
    session: {
      ...session,
      turns: [firstTurn],
      phase: "question",
    },
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
  console.log("[investLensService] completeLearning 시작 — sessionId=" + sessionId);
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

export async function respond(
  sessionId: string,
  userAnswer: string,
  coachCall?: CoachTurnCall
): Promise<RespondResult> {
  console.log("[investLensService] respond 시작 — sessionId=" + sessionId);
  const existingSession = getSessionById(sessionId);
  if (!existingSession) {
    throw new Error(`respond: 세션을 찾을 수 없습니다. sessionId=${sessionId}`);
  }

  const userTurn: LearningSession["turns"][0] = {
    role: "user",
    content: userAnswer,
    createdAt: new Date().toISOString(),
  };

  const updatedAfterUser: LearningSession = {
    ...existingSession,
    turns: [...existingSession.turns, userTurn],
    phase: "feedback",
  };
  saveSession(updatedAfterUser);

  const effectiveCoachCall = coachCall ?? callBeginnerStockCoach;

  let turnResponse;
  try {
    turnResponse = await effectiveCoachCall({
      session: updatedAfterUser,
      pastLearningContext: buildPastLearningContext(updatedAfterUser.userId),
      marketFixture: {
        companyId: updatedAfterUser.companyId,
        scene: updatedAfterUser.marketScene,
        numbers: updatedAfterUser.marketNumbers,
        status: updatedAfterUser.fixtureStatus ?? "unverified_mock",
      },
      userAnswer,
      conversationTurns: updatedAfterUser.turns,
    });
  } catch (error) {
    saveSession({
      ...updatedAfterUser,
      status: "failed",
      endedAt: new Date().toISOString(),
    });
    throw error;
  }

  const coachTurn: LearningSession["turns"][0] = {
    role: "coach",
    content: turnResponse.message,
    createdAt: new Date().toISOString(),
  };

  const finalPhase: LearningSession["phase"] =
    turnResponse.readyToComplete ? "ready_to_complete" : "question";

  const updatedSession: LearningSession = {
    ...updatedAfterUser,
    turns: [...updatedAfterUser.turns, coachTurn],
    phase: finalPhase,
  };
  saveSession(updatedSession);

  return {
    session: updatedSession,
    coachMessage: turnResponse.message,
    isQuestionTurn: turnResponse.isQuestionTurn,
    readyToComplete: turnResponse.readyToComplete,
  };
}
