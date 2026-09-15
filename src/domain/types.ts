// MVP 최소 타입 정의

export type CompanyId = "tesla" | "vti" | "samsung" | "nvidia";

export type LensId =
  | "expect_vs_actual"
  | "good_company_vs_good_stock"
  | "concentration_vs_diversification"
  | "revenue_growth_vs_profit_growth"
  | "growth_rate_vs_valuation"
  | "one_time_vs_structural"
  | "market_vs_company_specific"
  | "risk_breaks_my_logic";

export type LensStatus = "처음_봄" | "이해함" | "적용해봄";

export type DecisionAction = "투자함" | "투자하지 않음" | "공부만 함";

export type CandidateStatus =
  | "더_공부"
  | "관찰"
  | "투자_후보"
  | "보류"
  | "보유_추적";

export interface CompanyInfo {
  id: CompanyId;
  name: string;
}

export interface LensInfo {
  id: LensId;
  name: string;
}

// 과거 세션 요약 (coach에 전달할 맥락)
export interface PastSessionSummary {
  sessionId: string;
  companyId: CompanyId;
  companyName: string;
  coachLensUsedId: LensId;
  lensName: string;
  lensStatus: LensStatus;
  decisionAction: DecisionAction;
  judgment: string;
}

export interface PastLearningContext {
  userId: string;
  recentSessions: PastSessionSummary[];
  lensStates: Array<{ lensId: LensId; status: LensStatus; lastSeenAt: string }>;
  candidateStates: Array<{
    companyId: CompanyId;
    status: CandidateStatus;
    reason: string;
    updatedAt: string;
  }>;
}

// 학습 세션 (nullable 반영)
export interface LearningSession {
  id: string;
  userId: string;
  companyId: CompanyId;
  marketScene: string;
  marketNumbers: string;
  status: "in_progress" | "completed" | "failed";
  startedAt: string;
  endedAt: string | null;
  // 대화 턴 누적
  turns: Array<{
    role: "coach" | "user";
    content: string;
    createdAt: string;
  }>;
  // 현재 진행 단계
  phase: "question" | "feedback" | "ready_to_complete";
  // 종료 시점에 채워지는 필드 (nullable)
  coachLensUsedId: LensId | null;
  lensName: string | null;
  lensStatusAfter: LensStatus | null;
  decisionAction: DecisionAction | null;
  judgment: string | null;
  referencedSessionIds: string[];
  createdAt: string;
}

export interface SessionSummary {
  coachLensUsedId: LensId;
  lensName: string;
  lensStatusAfter: LensStatus;
  decisionAction: DecisionAction;
  judgment: string;
  relatedPastLearning: Array<{
    sessionId: string;
    lensName: string;
    relevance: string;
  }>;
}
