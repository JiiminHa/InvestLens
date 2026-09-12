import { createSeedSessions } from "../fixtures/seed";
import {
  seedStore,
  getSessions,
  getLensStatesForUser,
  getCandidateStatesForUser,
} from "../storage/memoryStore";
import { buildPastLearningContext } from "../services/learningContextBuilder";
import {
  createLearningSession,
  completeSessionWithSummary,
} from "../services/sessionManager";
import { MARKET_SCENE_FIXTURES } from "../fixtures/marketSceneFixtures";
import {
  callBeginnerStockCoach,
  callBeginnerStockCoachSummary,
} from "../coach/coachService";

async function main() {
  console.log("=== 1. seed load ===");
  const seedSessions = createSeedSessions();
  seedStore(seedSessions);

  const sessions = getSessions();
  console.log(`저장된 세션 수: ${sessions.length}`);
  sessions.forEach((s) => {
    console.log(
      `  - [${s.status}] ${s.companyId} | lens=${s.lensName} | action=${s.decisionAction} | judgment=${s.judgment}`
    );
  });

  console.log("\n=== 2. NVIDIA in_progress 세션 생성 (범용 structure) ===");
  const nvidiaFixture = MARKET_SCENE_FIXTURES.find(
    (f) => f.companyId === "nvidia"
  )!;
  const nvidiaSession = createLearningSession({
    userId: "demo_user",
    companyId: "nvidia",
    market_scene: nvidiaFixture.scene,
    market_numbers: nvidiaFixture.numbers,
  });

  console.log(`생성된 세션: ${nvidiaSession.id}`);
  console.log(`  status: ${nvidiaSession.status}`);
  console.log(`  coachLensUsedId: ${nvidiaSession.coachLensUsedId}`);
  console.log(`  lensStatusAfter: ${nvidiaSession.lensStatusAfter}`);
  console.log(`  decisionAction: ${nvidiaSession.decisionAction}`);
  console.log(`  judgment: ${nvidiaSession.judgment}`);

  console.log("\n=== 3. past_learning_context 생성 ===");
  const pastContext = buildPastLearningContext("demo_user");
  console.log(`최근 세션 수: ${pastContext.recentSessions.length}`);
  pastContext.recentSessions.forEach((s) => {
    console.log(
      `  - [${s.sessionId}] ${s.companyName} | lens=${s.lensName}(${s.lensStatus}) | action=${s.decisionAction} | judgment=${s.judgment}`
    );
  });

  console.log("\n=== 4. beginner-stock-coach 첫 턴 호출 ===");
  const turnResponse = await callBeginnerStockCoach({
    session: nvidiaSession,
    pastLearningContext: pastContext,
    marketFixture: nvidiaFixture,
  });
  console.log(`isQuestionTurn: ${turnResponse.isQuestionTurn}`);
  console.log(`메시지:\n${turnResponse.message}`);

  console.log("\n=== 5. coach 종료 요약 생성 (사용자 판단 가정) ===");
  const userJudgment =
    "NVIDIA도 시장 기대가 실제보다 앞서 있을 수 있다고 봤다. 실제 실적과 가이드라인의 확인을 더 해보고 싶다.";
  const userDecision:
    | "투자함"
    | "투자하지 않음"
    | "공부만 함" = "공부만 함";

  const summaryResponse = await callBeginnerStockCoachSummary(
    {
      session: nvidiaSession,
      pastLearningContext: pastContext,
      marketFixture: nvidiaFixture,
    },
    userJudgment,
    userDecision
  );

  console.log(`최종 메시지:\n${summaryResponse.finalMessage}`);
  console.log("\n종료 요약 요약:");
  console.log(`  coachLensUsedId: ${summaryResponse.summary.coachLensUsedId}`);
  console.log(`  lensName: ${summaryResponse.summary.lensName}`);
  console.log(
    `  lensStatusAfter: ${summaryResponse.summary.lensStatusAfter}`
  );
  console.log(
    `  decisionAction: ${summaryResponse.summary.decisionAction}`
  );
  console.log(`  judgment: ${summaryResponse.summary.judgment}`);
  console.log(
    `  relatedPastLearning: ${JSON.stringify(summaryResponse.summary.relatedPastLearning)}`
  );

  console.log("\n=== 6. 세션 완료 저장 ===");
  const completedSession = completeSessionWithSummary(
    nvidiaSession.id,
    summaryResponse.summary,
    summaryResponse.summary.relatedPastLearning.map((r) => r.sessionId)
  );

  console.log(`완료된 세션 상태: ${completedSession.status}`);
  console.log(`  coachLensUsedId: ${completedSession.coachLensUsedId}`);
  console.log(`  lensName: ${completedSession.lensName}`);
  console.log(`  lensStatusAfter: ${completedSession.lensStatusAfter}`);
  console.log(`  decisionAction: ${completedSession.decisionAction}`);
  console.log(`  judgment: ${completedSession.judgment}`);
  console.log(`  referencedSessionIds: ${completedSession.referencedSessionIds}`);

  console.log("\n=== 7. 최종 저장소 상태 ===");
  console.log("세션 목록:");
  getSessions().forEach((s) => {
    console.log(
      `  - [${s.status}] ${s.companyId} ${s.id} | lens=${s.lensName} | statusAfter=${s.lensStatusAfter} | action=${s.decisionAction} | judgment=${s.judgment}`
    );
  });

  console.log("\nlensStates:");
  getLensStatesForUser("demo_user").forEach((e) => {
    console.log(
      `  - ${e.lensId}: ${e.status} (lastSeenAt=${e.lastSeenAt})`
    );
  });

  console.log("\ncandidateStates:");
  const cands = getCandidateStatesForUser("demo_user");
  if (cands.length === 0) {
    console.log(
      "  (없음 — candidateStatus는 코치 자동 결정 대상이 아니며, 현재 seed에도 NVIDIA 후보는 없음)"
    );
  } else {
    cands.forEach((e) => {
      console.log(`  - ${e.companyId}: ${e.status} (reason=${e.reason})`);
    });
  }

  console.log("\n=== 검증 포인트 ===");
  const teslaInContext = pastContext.recentSessions.find(
    (s) => s.companyName === "Tesla"
  );
  console.log(
    `[확인] Tesla 세션이 past_learning_context에 포함됨: ${!!teslaInContext}`
  );
  if (teslaInContext) {
    console.log(
      `  Tesla lensName: ${teslaInContext.lensName}, lensStatus: ${teslaInContext.lensStatus}`
    );
  }

  const nvidiaCompleted = getSessions().find(
    (s) => s.companyId === "nvidia" && s.status === "completed"
  );
  console.log(
    `[확인] NVIDIA 세션이 completed로 저장됨: ${!!nvidiaCompleted}`
  );
  if (nvidiaCompleted) {
    console.log(
      `  NVIDIA lensName: ${nvidiaCompleted.lensName}, lensStatusAfter: ${nvidiaCompleted.lensStatusAfter}`
    );
  }

  const expectLensState = getLensStatesForUser("demo_user").find(
    (e) => e.lensId === "expect_vs_actual"
  );
  console.log(
    `[확인] expect_vs_actual 렌즈 상태가 '적용해봄'으로 갱신됨: ${
      expectLensState?.status === "적용해봄" ? "YES" : "NO"
    }`
  );

  const nvidiaCandidate = getCandidateStatesForUser("demo_user").find(
    (e) => e.companyId === "nvidia"
  );
  console.log(
    `[확인] NVIDIA candidateStatus가 자동 생성되지 않음: ${
      nvidiaCandidate ? "NO (생성됨 - 문제)" : "YES (미생성 - 정상)"
    }`
  );
}

main().catch((err) => {
  console.error("golden path test failed:", err);
  process.exit(1);
});
