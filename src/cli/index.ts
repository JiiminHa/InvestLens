import { startLearningTurn, completeLearning } from "../services/investLensService";
import { buildPastLearningContext } from "../services/learningContextBuilder";
import { MARKET_SCENE_FIXTURES } from "../fixtures/marketSceneFixtures";
import { companyName } from "../domain/constants";
import { CompanyId } from "../domain/types";

async function main() {
  console.log("=== InvestLens 학습 시작 ===\n");

  console.log("관심 있는 테마를 선택하세요:");
  const themes = [
    { name: "AI 인프라", description: "데이터센터, AI 칩, 클라우드 등 AI가 실제로 돌아가는 기반 시설." },
    { name: "전기차·자율주행", description: "전기차 제조, 배터리, 자율주행 소프트웨어 등." },
    { name: "반도체", description: "메모리, 파운드리, 팹리스 등 반도체 사이클이 중요한 기업." },
    { name: "분산투자·ETF", description: "개별기업 위험을 줄이고 시장 전체에 분산 노출되는 상품." },
  ];
  themes.forEach((t, i) => {
    console.log(`${i + 1}) ${t.name} — ${t.description}`);
  });

  console.log(`\n선택한 테마: ${themes[0].name}`);

  const companies: CompanyId[] = ["nvidia"];
  console.log("\n관련 종목:");
  companies.forEach((c) => {
    console.log(`${companyName(c)}`);
  });

  const companyId: CompanyId = companies[0];
  console.log(`\n선택한 종목: ${companyName(companyId)}`);

  const fixture = MARKET_SCENE_FIXTURES.find((f) => f.companyId === companyId);
  if (!fixture) {
    console.error(`market scene fixture가 없습니다: ${companyId}`);
    process.exit(1);
  }

  const pastContext = buildPastLearningContext("demo_user");

  console.log("\n=== 학습 턴 시작 ===");
  const turnResult = await startLearningTurn({
    userId: "demo_user",
    companyId,
    marketScene: fixture.scene,
    marketNumbers: fixture.numbers,
    pastContext,
    fixture,
  });

  console.log(`\n세션: ${turnResult.session.id} (${turnResult.session.status})`);
  console.log(`질문 포함: ${turnResult.isQuestionTurn}`);
  console.log(`첫 턴 응답:\n${turnResult.coachMessage}`);

  const userJudgment = "NVIDIA도 Tesla 때 배운 기대 vs 실제 관점으로 보고 싶다. 시장 기대가 실제보다 앞서 있을 수 있어서 실적과 가이드라인 확인이 필요하다고 생각한다.";
  const userDecision = "공부만 함" as const;

  console.log("\n=== 학습 종료 ===");
  const completionResult = await completeLearning(
    turnResult.session.id,
    pastContext,
    fixture,
    userJudgment,
    userDecision
  );

  console.log(`\n완료 렌즈: ${completionResult.session.lensName} (${completionResult.session.lensStatusAfter})`);
  console.log(`결정: ${completionResult.session.decisionAction}`);
  console.log(`판단: ${completionResult.session.judgment}`);
  console.log(`참조 세션: ${completionResult.session.referencedSessionIds}`);
  console.log(`\n최종 메시지:\n${completionResult.finalMessage}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
