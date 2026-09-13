import { startLearningTurn, completeLearning } from "../services/investLensService";
import { buildPastLearningContext } from "../services/learningContextBuilder";
import { createSeedSessions } from "../fixtures/seed";
import { seedStore, getSessions, getLensStatesForUser } from "../storage/memoryStore";
import { MARKET_SCENE_FIXTURES } from "../fixtures/marketSceneFixtures";
import { SessionSummary } from "../domain/types";

function assertDefined<T>(value: T | undefined, message: string): asserts value is T {
  if (value === undefined) throw new Error(message);
}

async function mockCoachForTest() {
  return {
    firstTurnMessage:
      "NVIDIA의 최근 장면에서 중요한 건 기대 vs 실제입니다. 시장 기대가 실제 실적·가이드라인보다 앞서 있을 수 있는지 생각해 보세요. 지금 이 장면에서 먼저 보이는 신호는 무엇인가요?",
    summary: {
      coachLensUsedId: "expect_vs_actual" as const,
      lensName: "기대 vs 실제",
      lensStatusAfter: "적용해봄" as const,
      decisionAction: "공부만 함" as const,
      judgment: "시장 기대가 실제보다 앞서 있을 수 있다고 봤다.",
      relatedPastLearning: [
        {
          sessionId: "sess_tesla_01",
          lensName: "기대 vs 실제",
          relevance: "Tesla 학습에서 배운 기대 vs 실제 렌즈를 NVIDIA 장면에도 적용 가능",
        },
      ],
    },
    finalMessage:
      "정리하면, 이번 nvidia 장면은 NVIDIA는 최근 데이터센터와 AI 관련 매출 기대가 크게 강조되고, 주가도 그 기대를 반영해 움직인 장면이다. 실제 매출·가이드라인과 시장의 기대 수준이 얼마나 겹치는지, 혹은 차이가 나는지가 판단 포인트다.\n\n사용한 렌즈: 기대 vs 실제\n판단: 시장 기대가 실제보다 앞서 있을 수 있다고 봤다.\n결정: 공부만 함\n\n과거 학습에서 다룬 \"기대 vs 실제\"을 이번 장면에도 적용할 수 있는지 확인했다.\n다음 학습으로 넘어가기 전에, 투자 일지와 knowledge graph에서 이 연결을 확인해 보라.",
  };
}

export async function mockCallBeginnerStockCoach(input: Parameters<typeof startLearningTurn>[0]): Promise<{ message: string; isQuestionTurn: boolean }> {
  const { firstTurnMessage } = await mockCoachForTest();
  return { message: firstTurnMessage, isQuestionTurn: firstTurnMessage.includes("?") };
}

export async function mockCallBeginnerStockCoachSummary(
  _input: Parameters<typeof completeLearning>[0],
  _userJudgment: string,
  _userDecision: string
): Promise<{ summary: SessionSummary; finalMessage: string }> {
  const { summary, finalMessage } = await mockCoachForTest();
  return { summary, finalMessage };
}

async function main() {
  console.log("=== 1. seed load ===");
  const seedSessions = createSeedSessions();
  seedStore(seedSessions);

  const userId = "demo_user";
  const companyId = "nvidia";

  const fixture = MARKET_SCENE_FIXTURES.find((f) => f.companyId === companyId);
  assertDefined(fixture, `market scene fixture가 없습니다: ${companyId}`);

  const pastContext = buildPastLearningContext(userId);
  console.log("과거 세션 수:", pastContext.recentSessions.length);

  console.log("\n=== 2. 학습 턴 시작 ===");
  const turnResult = await startLearningTurn(
    {
      userId,
      companyId,
      marketScene: fixture.scene,
      marketNumbers: fixture.numbers,
      pastContext,
      fixture,
    },
    mockCallBeginnerStockCoach
  );
  if (turnResult.session.status !== "in_progress") {
    throw new Error("세션 상태가 in_progress가 아님");
  }
  console.log(`세션: ${turnResult.session.id} (${turnResult.session.status})`);
  console.log(`질문 포함: ${turnResult.isQuestionTurn}`);

  const userJudgment = "NVIDIA도 시장 기대가 실제보다 앞서 있을 수 있다고 봤다.";
  const userDecision: "투자함" | "투자하지 않음" | "공부만 함" = "공부만 함";

  console.log("\n=== 3. 학습 종료 ===");
  const completionResult = await completeLearning(
    turnResult.session.id,
    pastContext,
    fixture,
    userJudgment,
    userDecision,
    mockCallBeginnerStockCoachSummary
  );
  if (completionResult.session.status !== "completed") {
    throw new Error("세션이 completed로 저장되지 않음");
  }
  if (completionResult.session.coachLensUsedId !== "expect_vs_actual") {
    throw new Error("coachLensUsedId가 expect_vs_actual이 아님");
  }
  if (completionResult.session.lensStatusAfter !== "적용해봄") {
    throw new Error("lensStatusAfter가 적용해봄이 아님");
  }
  console.log(`완료 세션: ${completionResult.session.id} → ${completionResult.session.status}`);
  console.log(`  lens: ${completionResult.session.lensName} (${completionResult.session.lensStatusAfter})`);
  console.log(`  decisionAction: ${completionResult.session.decisionAction}`);
  console.log(`  judgment: ${completionResult.session.judgment}`);

  console.log("\n=== 4. 재연결 확인 ===");
  const newPastContext = buildPastLearningContext(userId);
  const teslaInContext = newPastContext.recentSessions.find((s) => s.companyName === "Tesla");
  if (!teslaInContext) throw new Error("Tesla 세션이 과거 맥락에 포함되지 않음");

  const nvidiaCompleted = getSessions().find(
    (s) => s.companyId === "nvidia" && s.status === "completed"
  );
  if (!nvidiaCompleted) throw new Error("NVIDIA completed 세션이 저장되지 않음");

  const expectLensState = getLensStatesForUser(userId).find(
    (e) => e.lensId === "expect_vs_actual"
  );
  if (!expectLensState || expectLensState.status !== "적용해봄") {
    throw new Error("expect_vs_actual 렌즈 상태가 적용해봄으로 갱신되지 않음");
  }

  console.log("재연결 확인 완료: Tesla 세션 포함, NVIDIA completed 저장, 렌즈 상태 갱신");
}

main().catch((err) => {
  console.error("golden path test failed:", err);
  process.exit(1);
});
