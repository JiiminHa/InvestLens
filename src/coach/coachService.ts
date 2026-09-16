import fs from "fs";
import { MarketSceneFixture } from "../fixtures/marketSceneFixtures";
import { SKILL_TEXT_FALLBACK } from "./skillText";
import {
  PastLearningContext,
  LearningSession,
  SessionSummary,
  LensId,
  LensStatus,
  DecisionAction,
} from "../domain/types";

const SKILL_MD_PATH = ".hermes/skills/beginner-stock-coach/SKILL.md";

// 로컬에서는 SKILL.md 원본을 읽고, 읽을 수 없으면(서버리스 번들 등) 사본을 쓴다.
// 서버리스 환경에서는 .hermes 디렉터리가 함수 번들에 포함되지 않아 파일 읽기가 실패한다.
function loadSkillText(): string {
  try {
    if (fs.existsSync(SKILL_MD_PATH)) {
      return fs.readFileSync(SKILL_MD_PATH, "utf-8");
    }
  } catch (error) {
    console.warn("[coachService] SKILL.md 읽기 실패, 번들 사본 사용:", error);
  }
  console.log("[coachService] SKILL.md 파일 미발견 — 번들 사본(skillText.ts) 사용");
  return SKILL_TEXT_FALLBACK;
}

const SKILL_TEXT = loadSkillText();

const UPSTAGE_API_KEY = process.env.UPSTAGE_API_KEY;
const UPSTAGE_BASE_URL =
  process.env.UPSTAGE_BASE_URL || "https://api.upstage.ai/v1";

async function callSolar(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): Promise<string> {
  console.log("[coachService] callSolar 시작 — message 수:" + messages.length);
  if (!UPSTAGE_API_KEY) {
    throw new Error(
      "UPSTAGE_API_KEY not set. 실제 Skill 호출 불가."
    );
  }

  const url = UPSTAGE_BASE_URL + "/chat/completions";
  const headers: Record<string, string> = {
    Authorization: "Bearer " + UPSTAGE_API_KEY,
    "Content-Type": "application/json",
  };

  const body = JSON.stringify({
    model: "solar-pro4",
    messages,
    max_tokens: 4096,
    temperature: 0.7,
  });

  console.log("[coachService] Solar API 호출 시작 — url:" + url);
  const res = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  console.log("[coachService] Solar API 응답 도착 — status:" + res.status);
  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error("Solar API error " + res.status + ": " + bodyText);
  }

  const data = (await res.json()) as any;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Solar response에 내용이 없습니다.");
  }
  return content;
}

const EXTRACTION_SYSTEM = [
  "당신은 기업 리포트 텍스트에서 투자 코치가 바로 쓸 수 있는 핵심 데이터포인트만 추출하는 추출기이다.",
  "아래 리포트 텍스트를 읽고, 아래 항목만 짧고 구조화된 텍스트 블록으로 출력한다.",
  "추측하지 말고 텍스트에 명시된 정보만 쓴다. 불확실하면 '확인 불가'로 표기한다.",
  "",
  "출력 형식(정확히 이 구조를 따른다):",
  "- 기업명/티커: ",
  "- 실적(actual): ",
  "- 컨센서스/기대: ",
  "- 성장률: ",
  "- 밸류에이션 참고: ",
  "- 시장 반응/기대 요약: ",
  "- 확인 불가/불명확: ",
  "",
  "규칙:",
  "- 서술형 해설 말고 데이터 위주로 쓴다.",
  "- 숫자와 단위를 명확히 하고, actual과 consensus를 구분한다.",
  "- 리포트에 없는 항목을 창작하지 않는다.",
  "- 출력은 위 항목 줄만 낸다. 추가 설명 금지.",
].join("\n");

export async function extractInvestmentDataPool(reportText: string): Promise<string> {
  console.log("[coachService] 리포트 데이터 추출 시작 — 텍스트 길이:" + reportText.length);
  const content = await callSolar([
    { role: "system", content: EXTRACTION_SYSTEM },
    { role: "user", content: "아래 기업 리포트 텍스트에서 핵심 데이터포인트만 추출하라.\n\n" + reportText },
  ]);
  console.log("[coachService] 리포트 데이터 추출 완료 — 추출 결과 길이:" + content.length);
  return content;
}

function buildPastLines(pastLearningContext: PastLearningContext): string {
  const lines = pastLearningContext.recentSessions.map((s) => {
    return (
      "- " + s.companyName +
      "\n  - 렌즈: " + s.lensName + " (상태: " + s.lensStatus + ")" +
      "\n  - 사용자 판단: \"" + s.judgment + "\"" +
      "\n  - 결정: " + s.decisionAction
    );
  });
  return lines.join("\n");
}

function buildPastContextBlock(pastLearningContext: PastLearningContext): string {
  const pastLines = buildPastLines(pastLearningContext);
  if (pastLines.length > 0) {
    return (
      "## 과거 학습 맥락 (앱이 전달한 참고용)\n" +
      pastLines +
      "\n\n위 기록은 앱이 건네준 참고용이며, 어떤 렌즈를 쓸지는 당신이 현재 시장 장면을 보고 직접 결정한다.\n" +
      "이번에 고른 렌즈를 위 기록에서 이미 써본 적이 있다면, 렌즈를 소개하는 문장에서 반드시 그 기업 이름을 넣어 한 문장으로 연결하라. 예: '지난번 Tesla 학습에서 써본 기대 vs 실제 렌즈를 이번 장면에 다시 적용해보자.' 기록에 없는 렌즈라면 연결 문장을 지어내지 마라.\n"
    );
  }
  return "## 과거 학습 맥락\n사용자가 아직 학습한 기록이 없다. 필요하면 새로운 개념을 처음부터 가르쳐라.\n";
}

function buildUserPrompt(
  session: LearningSession,
  marketFixture: MarketSceneFixture,
  pastContextBlock: string,
  dataPool?: string
): string {
  const parts: string[] = [];
  parts.push("## 현재 고객 요청");
  parts.push("- 기업/테마: " + session.companyId);
  if (dataPool) {
    parts.push("- 데이터 포인트 풀(추출 결과):");
    parts.push(dataPool);
  } else {
    parts.push("- 시장 장면: " + marketFixture.scene);
    if (marketFixture.numbers) {
      parts.push("- 참고 숫자/정보: " + marketFixture.numbers);
    }
  }
  if (!dataPool && marketFixture.status === "unverified_mock") {
    parts.push("- 참고: 위 장면과 숫자는 학습용 예시 시나리오다. 실제 최신 공시가 아니므로 사실로 단정하지는 말되, 이 숫자들을 그대로 써서 판단 연습을 시켜라.");
  } else if (dataPool) {
    parts.push("- 참고: 위 데이터 포인트는 사용자가 제공한 실제 기업 리포트에서 추출한 것이다. 이 데이터에 근거해 코칭하고, 풀에 없는 숫자는 만들어내지 마라.");
  }
  parts.push("");
  parts.push(pastContextBlock);
  parts.push("");
  parts.push("## 당신의 역할");
  parts.push("위 시장 장면을 교재로 써서, 지금 필요한 투자 렌즈 하나를 꺼내고 사용자의 판단을 묻는 질문을 던져라.");
  parts.push("");
  parts.push("## 규칙");
  parts.push("- 한 턴은 작게 끝낸다. \"시장 장면/숫자 → 투자 렌즈 하나 → 짧은 판단 질문\"에서 멈춘다.");
  parts.push("- 판단 질문을 던졌으면 같은 응답에서 정답, 해설, 다음 학습 단계까지 말하지 마라.");
  parts.push("- 이미 배운 렌즈가 있으면 새로운 장면에서 재사용하게 할 수 있다.");
  parts.push("- 새 개념이면 먼저 가르치고, 배운 개념이면 사용자가 먼저 판단하게 하라.");
  parts.push("- 종목을 대신 골라주거나 매수/매도 결론을 내리지 마라.");
  parts.push("- 확인되지 않은 숫자를 만들어내지 마라.");
  parts.push("- 대화가 이미 진행 중이면 장면과 렌즈를 처음부터 다시 소개하지 마라. 사용자의 마지막 답변에 대한 짧은 피드백으로 시작하고, 필요하면 숫자 하나만 더 짚은 뒤, 다음 판단 질문 하나로 끝내라.");
  parts.push("- 한국어로 답하라.");
  parts.push("- 5줄 이내, 300자 이내로 짧게 써라. 마크다운 장식(**, ##, 표)을 쓰지 마라.");
  parts.push("- 주어진 숫자 중 최소 두 개를 응답 안에 그대로 인용해라. 숫자 없이 추상적으로 묻지 마라.");
  parts.push("");
  parts.push("## 출력");
  parts.push("대화형 코칭 응답만 돌려줘. 끝에 판단 질문 하나를 넣어라.");
  parts.push("판단 질문 바로 아래에 선택지를 2~3개 제시하라. 각 선택지는 반드시 새 줄에서 'A. ', 'B. ', 'C. '로 시작하는 한 줄로 쓴다. 선택지를 질문 문장 안에 이어 쓰거나 'A/B로 답해라'처럼 쓰지 마라. 선택지 뒤에는 아무 문장도 덧붙이지 마라.");
  return parts.join("\n");
}

function buildFirstTurnSystemPrompt(): string {
  return SKILL_TEXT;
}

export async function callBeginnerStockCoach(
  input: {
    session: LearningSession;
    pastLearningContext: PastLearningContext;
    marketFixture: MarketSceneFixture;
    userAnswer?: string;
    conversationTurns?: Array<{ role: "coach" | "user"; content: string }>;
    dataPool?: string;
  }
): Promise<{ message: string; isQuestionTurn: boolean; readyToComplete: boolean }> {
  const pastContextBlock = buildPastContextBlock(input.pastLearningContext);
  const system = buildFirstTurnSystemPrompt();
  const user = buildUserPrompt(input.session, input.marketFixture, pastContextBlock, input.dataPool);

  // 지금까지의 대화를 그대로 이어 붙인다. 이게 없으면 모델은 매 턴 첫 턴으로 착각한다.
  const history = (input.conversationTurns ?? []).map((turn) => ({
    role: turn.role === "coach" ? ("assistant" as const) : ("user" as const),
    content: turn.content,
  }));

  const content = await callSolar([
    { role: "system", content: system },
    { role: "user", content: user },
    ...history,
  ]);

  const hasQuestion = /[?]/.test(content);

  return {
    message: content,
    isQuestionTurn: hasQuestion,
    readyToComplete: !hasQuestion,
  };
}

function buildSummarySystemPrompt(): string {
  const lensListLines = LENS_LIST.map((l) => `- ${l.id}: ${l.name}`).join("\n");
  return [
    "당신은 투자 학습 코치의 세션 종료 요약을 만드는 보조 채널이다.",
    "아래 규칙으로 JSON을 출력한다. 다른 텍스트는 넣지 마라.",
    "",
    "규칙:",
    "- lensUsed: 이번 세션에서 실제로 사용한 투자 렌즈.",
    "  과거 맥락에 같은 렌즈가 있고 현재 장면에도 맞으면 재사용으로 볼 수 있다.",
    " 과거 맥락에 없어도 현재 장면만으로 적절한 렌즈를 골라라.",
    "- lensUsed는 반드시 아래 id 중 하나여야 한다. 목록에 없는 id는 쓰지 마라.",
    lensListLines,
    "",
    "- lensStatusAfter: 이번 세션에서 사용자가 그 렌즈를 적용했으면 '적용해봄', 이해하면 '이해함', 처음이면 '처음_봄'.",
    "- decisionAction: 사용자가 말한 decision을 그대로 써라.",
    "- judgment: 사용자가 말한 판단을 짧게 요약하라.",
    "- relatedPastLearning: 과거 학습 중 이번 세션과 관련된 것만 넣어라.",
    "",
    "출력 예시:",
    "{\"lensUsed\":\"expect_vs_actual\",\"lensStatusAfter\":\"적용해봄\",\"decisionAction\":\"공부만 함\",\"judgment\":\"...\",\"relatedPastLearning\":[{\"sessionId\":\"...\",\"lensName\":\"...\",\"relevance\":\"...\"}]}",
  ].join("\n");
}

function buildSummaryUserPrompt(
  session: LearningSession,
  marketFixture: MarketSceneFixture,
  userJudgment: string,
  userDecision: DecisionAction,
  pastLearningContext: PastLearningContext,
  dataPool?: string
): string {
  const parts: string[] = [];
  parts.push("## 세션 정보");
  parts.push("- 기업/테마: " + session.companyId);
  if (!dataPool) {
    parts.push("- 시장 장면: " + marketFixture.scene);
  }
  parts.push("");
  if (dataPool) {
    parts.push("## 리포트에서 추출한 데이터 풀");
    parts.push(dataPool);
    parts.push("");
  }
  const recentTurns = (session.turns ?? []).slice(-6);
  if (recentTurns.length > 0) {
    parts.push("## 이번 세션 대화");
    for (const turn of recentTurns) {
      const speaker = turn.role === "coach" ? "코치" : "사용자";
      parts.push("- " + speaker + ": " + turn.content.slice(0, 300));
    }
    parts.push("");
  }
  parts.push("## 사용자 판단");
  parts.push("- 판단: " + userJudgment);
  parts.push("- 결정: " + userDecision);
  parts.push("");
  parts.push("## 과거 학습 맥락");

  const pastLines = pastLearningContext.recentSessions.map((s) => {
    return "- sessionId=" + s.sessionId + " / " + s.companyName + ": " + s.lensName +
      " (상태: " + s.lensStatus + ") / 판단: \"" + s.judgment + "\" / 결정: " + s.decisionAction;
  });
  parts.push(pastLines.join("\n"));
  parts.push("");
  parts.push("위 정보를 바탕으로 JSON 요약을 출력하라.");
  return parts.join("\n");
}

const LENS_LIST = [
  { id: "expect_vs_actual", name: "기대 vs 실제" },
  { id: "good_company_vs_good_stock", name: "좋은 회사 vs 좋은 주식" },
  { id: "concentration_vs_diversification", name: "집중 노출 vs 분산 노출" },
  { id: "revenue_growth_vs_profit_growth", name: "매출 성장 vs 이익 성장" },
  { id: "growth_rate_vs_valuation", name: "성장률 vs 밸류에이션" },
  { id: "one_time_vs_structural", name: "일회성 뉴스 vs 구조적 변화" },
  { id: "market_vs_company_specific", name: "시장 전체 영향 vs 기업 고유 영향" },
  { id: "risk_breaks_my_logic", name: "리스크 = 내 투자 논리를 깨뜨리는 조건" },
];

function findLensFromTurns(
  turns: Array<{ role: "coach" | "user"; content: string; createdAt: string }>
): string | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.role !== "coach") continue;
    for (const lens of LENS_LIST) {
      if (turn.content.includes(lens.name)) {
        return lens.id;
      }
    }
  }
  return null;
}

function parseJsonFromContent(content: string): any {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    return null;
  }
  return null;
}

export async function callBeginnerStockCoachSummary(
  input: {
    session: LearningSession;
    pastLearningContext: PastLearningContext;
    marketFixture: MarketSceneFixture;
    dataPool?: string;
  },
  userJudgment: string,
  userDecision: DecisionAction
): Promise<{ summary: SessionSummary; finalMessage: string }> {
  const system = buildSummarySystemPrompt();
  const user = buildSummaryUserPrompt(
    input.session,
    input.marketFixture,
    userJudgment,
    userDecision,
    input.pastLearningContext,
    input.dataPool
  );

  const content = await callSolar([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  const parsed = parseJsonFromContent(content);

  // (a) 파싱된 lensUsed가 유효 목록이면 그대로 사용
  let lensUsed: string;
  if (parsed && LENS_LIST.some((l) => l.id === parsed.lensUsed)) {
    lensUsed = parsed.lensUsed;
  } else {
    // (b) 코치 발화에서 렌즈 이름을 거꾸로 훑는다
    const found = findLensFromTurns(input.session.turns);
    if (found) {
      lensUsed = found;
      console.warn(
        "[coachService] summary의 lensUsed가 유효하지 않아 대화에서 보정 사용: 받은 값=" +
          (parsed?.lensUsed || "(parse 실패)") +
          ", 보정값=" +
          lensUsed
      );
    } else {
      // (c) 그래도 못 찾으면 기본값, 경고 남김
      console.warn(
        "[coachService] lensUsed를 판별하지 못해 기본값(expect_vs_actual) 사용. parsed:",
        parsed ? JSON.stringify(parsed) : "parse 실패",
        "content:",
        content.slice(0, 300)
      );
      lensUsed = "expect_vs_actual";
    }
  }

  const lensInfo = LENS_LIST.find((l) => l.id === lensUsed)!;

  const summary: SessionSummary = {
    coachLensUsedId: lensUsed as LensId,
    lensName: lensInfo.name,
    lensStatusAfter: (parsed?.lensStatusAfter as LensStatus) || "적용해봄",
    decisionAction: (parsed?.decisionAction as DecisionAction) || userDecision,
    judgment: parsed?.judgment || userJudgment,
    relatedPastLearning: (parsed?.relatedPastLearning || []).map((r: any) => ({
      sessionId: r.sessionId || "",
      lensName: r.lensName || "",
      relevance: r.relevance || "",
    })),
  };

  const finalMessage = input.dataPool
    ? "정리하면, 이번 " + input.session.companyId + " 장면은 사용자가 제공한 리포트에서 추출한 아래 데이터를 기준으로 봤다.\n" + input.dataPool + "\n\n" +
      "사용한 렌즈: " + summary.lensName + "\n" +
      "판단: " + summary.judgment + "\n" +
      "결정: " + summary.decisionAction + "\n\n" +
      "과거 학습에서 다룬 \"" + summary.lensName + "\"을 이번 장면에도 적용할 수 있는지 확인했다.\n" +
      "다음 학습으로 넘어가기 전에, 투자 일지와 knowledge graph에서 이 연결을 확인해 보라."
    : "정리하면, 이번 " + input.session.companyId + " 장면은 " + input.marketFixture.scene + "\n\n" +
      "사용한 렌즈: " + summary.lensName + "\n" +
      "판단: " + summary.judgment + "\n" +
      "결정: " + summary.decisionAction + "\n\n" +
      "과거 학습에서 다룬 \"" + summary.lensName + "\"을 이번 장면에도 적용할 수 있는지 확인했다.\n" +
      "다음 학습으로 넘어가기 전에, 투자 일지와 knowledge graph에서 이 연결을 확인해 보라.";

  return { summary, finalMessage };
}
