import {
  PastLearningContext,
  PastSessionSummary,
  LearningSession,
  LensId,
  LensStatus,
  CompanyId,
  CandidateStatus,
  DecisionAction,
} from "../domain/types";
import {
  getSessions,
  getLensStatesForUser,
  getCandidateStatesForUser,
} from "../storage/memoryStore";
import { companyName, lensName } from "../domain/constants";

export function buildPastLearningContext(userId: string): PastLearningContext {
  const sessions: LearningSession[] = getSessions().filter(
    (s) => s.userId === userId && s.status === "completed"
  );

  const sorted = sessions.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  const recentSessions: PastSessionSummary[] = sorted.slice(0, 10).map((s) => ({
    sessionId: s.id,
    companyId: s.companyId,
    companyName: companyName(s.companyId),
    coachLensUsedId: s.coachLensUsedId ?? "expect_vs_actual",
    lensName: s.lensName ?? "",
    lensStatus: s.lensStatusAfter ?? "처음_봄",
    decisionAction: s.decisionAction ?? "공부만 함",
    judgment: s.judgment ?? "",
  }));

  return {
    userId,
    recentSessions,
    lensStates: getLensStatesForUser(userId).map((e) => ({
      lensId: e.lensId as LensId,
      status: e.status,
      lastSeenAt: e.lastSeenAt,
    })),
    candidateStates: getCandidateStatesForUser(userId).map((e) => ({
      companyId: e.companyId as CompanyId,
      status: e.status,
      reason: e.reason,
      updatedAt: e.updatedAt,
    })),
  };
}
