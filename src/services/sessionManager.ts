import { LearningSession, SessionSummary, LensId, LensStatus, DecisionAction, CompanyId } from "../domain/types";
import { getSessionById, saveSession, upsertLensState } from "../storage/memoryStore";
import { nowISO } from "../domain/constants";

export interface CreateSessionInput {
  userId: string;
  companyId: string;
  market_scene: string;
  market_numbers: string;
}

export function createLearningSession(input: CreateSessionInput): LearningSession {
  const now = nowISO();
  const session: LearningSession = {
    id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    companyId: input.companyId as CompanyId,
    marketScene: input.market_scene,
    marketNumbers: input.market_numbers,
    coachLensUsedId: null,
    lensName: null,
    lensStatusAfter: null,
    decisionAction: null,
    judgment: null,
    referencedSessionIds: [],
    startedAt: now,
    endedAt: null,
    status: "in_progress",
    createdAt: now,
  };

  saveSession(session);
  return session;
}

export function completeSessionWithSummary(
  sessionId: string,
  summary: SessionSummary,
  relatedPastSessionIds: string[] = []
): LearningSession {
  const existing = getSessionById(sessionId);
  if (!existing) throw new Error(`Session not found: ${sessionId}`);

  const updated: LearningSession = {
    ...existing,
    coachLensUsedId: summary.coachLensUsedId as LensId,
    lensName: summary.lensName,
    lensStatusAfter: summary.lensStatusAfter as LensStatus,
    decisionAction: summary.decisionAction as DecisionAction,
    judgment: summary.judgment,
    referencedSessionIds: relatedPastSessionIds,
    endedAt: nowISO(),
    status: "completed",
  };

  saveSession(updated);

  upsertLensState({
    userId: existing.userId,
    lensId: summary.coachLensUsedId,
    status: summary.lensStatusAfter as LensStatus,
    lastSeenAt: nowISO(),
  });

  return updated;
}
