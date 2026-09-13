import fs from "fs";
import { MarketSceneFixture } from "../fixtures/marketSceneFixtures";
import {
  PastLearningContext,
  LearningSession,
  SessionSummary,
  LensId,
  LensStatus,
  DecisionAction,
} from "../domain/types";

const SKILL_MD_PATH = ".hermes/skills/beginner-stock-coach/SKILL.md";
const SKILL_TEXT = fs.existsSync(SKILL_MD_PATH)
  ? fs.readFileSync(SKILL_MD_PATH, "utf-8")
  : "";

const UPSTAGE_API_KEY = process.env.UPSTAGE_API_KEY;
const UPSTAGE_BASE_URL =
  process.env.UPSTAGE_BASE_URL || "https://api.upstage.ai/v1";

async function callSolar(
  messages: Array<{ role: "system" | "user"; content: string }>
): Promise<string> {
  if (!UPSTAGE_API_KEY) {
    throw new Error(
      "UPSTAGE_API_KEY not set. 실제 Skill 호출 불가."
    );
  }

  const res = await fetch(`${UPSTAGE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "solar-pro4",
      messages,
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Solar API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as any;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Solar response에 내용이 없습니다.");
  }
  return content;
}

function buildFirstTurnPrompt(
  input: {
    session: LearningSession;
    pastLearningContext: PastLearningContext;
    marketFixture: MarketSceneFixture;
  },
  isFirstTurn: boolean
): { system: string; user: string } {
  const { session, pastLearningContext, marketFixture } = input;

  const pastLines = pastLearningContext.recentSessions.map((s) => {
    return [
      `- ${s.companyName}`,
      `  - 렌즈: ${s.lensName} (상태: ${s.lensStatus})`,
      `  - 사용자 판단: "${s.judgment}"`,
      `  - 결정: ${s.decisionAction}`,
    ].join("\n");
  });

  const pastContextBlock = pastLines.length > 0
    ? ["## 과거 학습 맥락 (앱이 전달한 참고용)"]
        .concat(pastLines)
        .concat([
          "",
          "위 기록은 앱이 건네준 참고용이며, 어떤 렌즈를 쓸지는 당신이 현재 시장 장면을 보고 직접 결정한다.",
        ])
        .join("\n")
    : "## 과거 학습 맥락\n사용자가 아직 학습한 기록이 없다. 필요하면 새로운 개념을 처음부터 가르쳐라.\n";

  const user = [
    `## 현재 고객 요청`,
    `- 기업/테마: ${session.companyId}`,
    `- 시장 장면: ${marketFixture.scene}`,
    `${
      marketFixture.numbers
        ? `- 참고 숫자/정보: ${marketFixture.numbers}\n`
        : ""
    }`,
    `${
      marketFixture.status === "unverified_mock"
        ? "- 참고: 이 장면은 wiring 테스트용 미검증 목업이다. 현재 턴에서는 장면 자체가 아니라 코칭 구조를 확인하는 데 집중해라.\n"
        : ""
    }`,
    pastContextBlock,
    "",
    `## 당신의 역할`,
    `위 시장 장면을 교재로 써서, 지금 필요한 투자 렌즈 하나를 꺼내고 사용자의 판단을 묻는 질문을 던져라.`,
    ``,
    `## 규칙`,
    `- 한 턴은 작게 끝낸다. "시장 장면/숫자 → 투자 렌즈 하나 → 짧은 판단 질문"에서 멈춘다.`,
    `- 판단 질문을 던졌으면 같은 응답에서 정답, 해설, 다음 학습 단계까지 말하지 마라.`,
    `- 이미 배운 렌즈가 있으면 새로운 장면에서 재사용하게 할 수 있다.`,
    `- 새 개념이면 먼저 가르치고, 배운 개념이면 사용자가 먼저 판단하게 하라.`,
    `- 종목을 대신 골라주거나 매수/매도 결론을 내리지 마라.`,
    `- 확인되지 않은 숫자를 만들어내지 마라.`,
    `- 한국어로 답하라.`,
    ``,
    `## 출력`,
    `대화형 코칭 응답만 돌려줘. 끝에 판단 질문 하나를 넣어라.`,
  ].join("\n");

  return { system: SKILL_TEXT, user };
}

export async function callBeginnerStockCoach(
  input: {
    session: LearningSession;
    pastLearningContext: PastLearningContext;
    marketFixture: MarketSceneFixture;
  }
): Promise<{ message: string; isQuestionTurn: boolean }> {
  const { system, user } = buildFirstTurnPrompt(input, true);

  const content = await callSolar([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  const hasQuestion = /[?]/.test(content);

  return {
    message: content,
    isQuestionTurn: hasQuestion,
  };
}

export async function callBeginnerStockCoachSummary(
  input: {
    session: LearningSession;
    pastLearningContext: PastLearningContext;
    marketFixture: MarketSceneFixture;
  },
  userJudgment: string,
  userDecision: DecisionAction
): Promise<{ summary: SessionSummary; finalMessage: string }> {
  const { session, pastLearningContext, marketFixture } = input;

  const system = [
    "당신은 투자 학습 코치의 세션 종료 요약을 만드는 보조 채널이다.",
    "아래 규칙으로 JSON을 출력한다. 다른 텍스트는 넣지 마라.",
    "",
    "규칙:",
    "- lensUsed: 이번 세션에서 실제로 사용한 투자 렌즈.",
    "  과거 맥락에 같은 렌즈가 있고 현재 장면에도 맞으면 재사용으로 볼 수 있다.",
    " 과거 맥락에 없어도 현재 장면만으로 적절한 렌즈를 골라라.",
    "- lensStatusAfter: 이번 세션에서 사용자가 그 렌즈를 적용했으면 '적용해봄', 이해하면 '이해함', 처음이면 '처음_봄'.",
    "- decisionAction: 사용자가 말한 decision을 그대로 써라.",
    "- judgment: 사용자가 말한 판단을 짧게 요약하라.",
    "- relatedPastLearning: 과거 학습 중 이번 세션과 관련된 것만 넣어라.",
    "",
    "출력 예시:",
    "{\"lensUsed\":\"expect_vs_actual\",\"lensStatusAfter\":\"적용해봄\",\"decisionAction\":\"공부만 함\",\"judgment\":\"...\",\"relatedPastLearning\":[{\"sessionId\":\"...\",\"lensName\":\"...\",\"relevance\":\"...\"}]}",
  ].join("\n");

  const user = [
    `## 세션 정보`,
    `- 기업/테마: ${session.companyId}`,
    `- 시장 장면: ${marketFixture.scene}`,
    ``,
    `## 사용자 판단`,
    `- 판단: ${userJudgment}`,
    `- 결정: ${userDecision}`,
    ``,
    `## 과거 학습 맥락`,
    pastLearningContext.recentSessions
      .map(
        (s) =>
          `- ${s.companyName}: ${s.lensName} (상태: ${s.lensStatus}) / 판단: "${s.judgment}" / 결정: ${s.decisionAction}`
      )
      .join("\n")
      .concat("\n"),
    ``,
    `위 정보를 바탕으로 JSON 요약을 출력하라.`,
  ].join("\n");

  const content = await callSolar([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  let parsed: any = null;
  try {
    const json = content.match(/\{[\s\S]*\}/);
    if (json) {
      parsed = JSON.parse(json[0]);
    }
  } catch {
    parsed = null;
  }

  const lensUsed = parsed?.lensUsed || "expect_vs_actual";
  const lensInfo = [
    { id: "expect_vs_actual", name: "기대 vs 실제" },
    { id: "good_company_vs_good_stock", name: "좋은 회사 vs 좋은 주식" },
    { id: "concentration_vs_diversification", name: "집중 노출 vs 분산 노출" },
    { id: "revenue_growth_vs_profit_growth", name: "매출 성장 vs 이익 성장" },
    { id: "growth_rate_vs_valuation", name: "성장률 vs 밸류에이션" },
    { id: "one_time_vs_structural", name: "일회성 뉴스 vs 구조적 변화" },
    { id: "market_vs_company_specific", name: "시장 전체 영향 vs 기업 고유 영향" },
    { id: "risk_breaks_my_logic", name: "리스크 = 내 투자 논리를 깨뜨리는 조건" },
  ].find((l) => l.id === lensUsed) || {
    id: "expect_vs_actual",
    name: "기대 vs 실제",
  };

  const summary: SessionSummary = {
    coachLensUsedId: lensUsed as LensId,
    lensName: lensInfo.name,
    lensStatusAfter: (parsed?.lensStatusAfter as LensStatus) || "적용해봄",
    decisionAction: (parsed?.decisionAction as DecisionAction) || userDecision,
    judgment: parsed?.judgment || userJudgment,
    relatedPastLearning: (parsed?.relatedPastLearning || [])
      .map((r: any) => ({
        sessionId: r.sessionId || "",
        lensName: r.lensName || "",
        relevance: r.relevance || "",
      })),
  };

  const finalMessage = [
    `정리하면, 이번 ${session.companyId} 장면은 ${marketFixture.scene}`,
    ``,
    `사용한 렌즈: ${summary.lensName}`,
    `판단: ${summary.judgment}`,
    `결정: ${summary.decisionAction}`,
    ``,
    `과거 학습에서 다룬 "${summary.lensName}"을 이번 장면에도 적용할 수 있는지 확인했다.`,
    `다음 학습으로 넘어가기 전에, 투자 일지와 knowledge graph에서 이 연결을 확인해 보라.`,
  ].join("\n");

  return { summary, finalMessage };
}
