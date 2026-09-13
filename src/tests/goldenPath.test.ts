import { startLearningTurn, completeLearning } from "../services/investLensService";
import { buildPastLearningContext } from "../services/learningContextBuilder";
import { createSeedSessions } from "../fixtures/seed";
import { seedStore } from "../storage/memoryStore";
import { MARKET_SCENE_FIXTURES } from "../fixtures/marketSceneFixtures";
import { companyName } from "../domain/constants";

async function main() {
  console.log("=== 1. seed load ===");
  const seedSessions = createSeedSessions();
  seedStore(seedSessions);

  const userId = "demo_user";
  const companyId = "nvidia";

  const fixture = MARKET_SCENE_FIXTURES.find((f) => f.companyId === companyId);
  if (!fixture) {
    console.error("market scene fixture가 없습니다:", companyId);
    process.exit(1);
  }

  const pastContext = buildPastLearningContext(userId);
  console.log("과거 세션 수:", pastContext.recentSessions.length);
  pastContext.recentSessions.forEach((s) => {
    console.log(`  - ${s.companyName}: ${s.lensName} (${s.lensStatus}) / 판단: "${s.judgment}"`);
  });

  console.log("\n=== 2. 학습 턴 시작 ===");
  const turnResult = await startLearningTurn({
    userId,
    companyId,
    marketScene: fixture.scene,
    marketNumbers: fixture.numbers,
    pastContext,
    fixture,
  });
  console.log(`세션: ${turnResult.session.id} (${turnResult.session.status})`);
  console.log(`질문 포함: ${turnResult.isQuestionTurn}`);
  console.log(`첫 턴 응답:\n${turnResult.coachMessage}`);

  const userJudgment =
    "NVIDIA도 시장 기대가 실제보다 앞서 있을 수 있다고 봤다. 실제 실적과 가이드라인의 확인을 더 해보고 싶다.";
  const userDecision = "공부만 함" as const;

  console.log("\n=== 3. 학습 종료 ===");
  const completionResult = await completeLearning(
    turnResult.session.id,
    pastContext,
    fixture,
    userJudgment,
    userDecision
  );
  console.log(`완료 세션: ${completionResult.session.id} → ${completionResult.session.status}`);
  console.log(`  lens: ${completionResult.session.lensName} (${completionResult.session.lensStatusAfter})`);
  console.log(`  decisionAction: ${completionResult.session.decisionAction}`);
  console.log(`  judgment: ${completionResult.session.judgment}`);
  console.log(`  referencedSessionIds: ${completionResult.session.referencedSessionIds}`);

  console.log("\n=== 4. 재연결 확인 ===");
  const newPastContext = buildPastLearningContext(userId);
  console.log(`과거 세션 수: ${newPastContext.recentSessions.length}`);
  newPastContext.recentSessions.forEach((s) => {
    console.log(`  - ${s.companyName}: ${s.lensName} (${s.lensStatus}) / 판단: "${s.judgment}"`);
  });

  const teslaInContext = newPastContext.recentSessions.find((s) => s.companyName === "Tesla");
  console.log(`[확인] Tesla 세션이 과거 맥락에 포함됨: ${!!teslaInContext}`);
  console.log(`[확인] NVIDIA 세션이 completed로 저장됨: ${completionResult.session.status === "completed"}`);
  console.log(
    `[확인] expect_vs_actual 렌즈 상태가 '적용해봄'으로 갱신됨: ${completionResult.session.lensStatusAfter === "적용해봄" ? "YES" : "NO"}`
  );
}

main().catch((err) => {
  console.error("golden path test failed:", err);
  process.exit(1);
});
