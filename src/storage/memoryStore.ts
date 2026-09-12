import { LearningSession, LensStatus, CandidateStatus } from "../domain/types";
import { nowISO } from "../domain/constants";

interface Store {
  sessions: LearningSession[];
  lensStates: Array<{ userId: string; lensId: string; status: LensStatus; lastSeenAt: string }>;
  candidateStates: Array<{ userId: string; companyId: string; status: CandidateStatus; reason: string; updatedAt: string }>;
}

const store: Store = {
  sessions: [],
  lensStates: [],
  candidateStates: [],
};

export function seedStore(seededSessions: LearningSession[]) {
  store.sessions = seededSessions.map(s => ({ ...s }));
  store.lensStates = [];
  store.candidateStates = [];
}

export function getSessions(): LearningSession[] {
  return store.sessions;
}

export function getSessionById(id: string): LearningSession | undefined {
  return store.sessions.find(s => s.id === id);
}

export function saveSession(session: LearningSession) {
  const idx = store.sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    store.sessions[idx] = { ...session };
  } else {
    store.sessions.push({ ...session });
  }
}

export function getLensStatesForUser(userId: string) {
  return store.lensStates.filter(e => e.userId === userId);
}

export function upsertLensState(entry: { userId: string; lensId: string; status: LensStatus; lastSeenAt: string }) {
  const idx = store.lensStates.findIndex(
    e => e.userId === entry.userId && e.lensId === entry.lensId
  );
  if (idx >= 0) {
    store.lensStates[idx] = { ...entry };
  } else {
    store.lensStates.push({ ...entry });
  }
}

export function getCandidateStatesForUser(userId: string) {
  return store.candidateStates.filter(e => e.userId === userId);
}

export function upsertCandidateState(entry: { userId: string; companyId: string; status: CandidateStatus; reason: string }) {
  const idx = store.candidateStates.findIndex(
    e => e.userId === entry.userId && e.companyId === entry.companyId
  );
  if (idx >= 0) {
    store.candidateStates[idx] = { ...entry, updatedAt: nowISO() };
  } else {
    store.candidateStates.push({ ...entry, updatedAt: nowISO() });
  }
}
