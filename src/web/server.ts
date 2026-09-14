import http from "node:http";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { buildPastLearningContext } from "../services/learningContextBuilder";
import { seedStore } from "../storage/memoryStore";
import { createSeedSessions } from "../fixtures/seed";
import { MARKET_SCENE_FIXTURES } from "../fixtures/marketSceneFixtures";
import { THEMES, companiesForTheme } from "../domain/themes";
import { companyName } from "../domain/constants";
import { lensName } from "../domain/constants";
import { startLearningTurn, completeLearning } from "../services/investLensService";
import { mockCoachTurn, mockCoachSummary } from "./server-coach-mock";

const WEB_ROOT = process.cwd();

seedStore(createSeedSessions());

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8" };

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(data));
}

function badRequest(res: http.ServerResponse, message: string) {
  json(res, { error: message }, 400);
}

function notFound(res: http.ServerResponse) {
  json(res, { error: "not found" }, 404);
}

function serveFile(res: http.ServerResponse, path: string) {
  const full = join(WEB_ROOT, path);
  if (!existsSync(full)) {
    notFound(res);
    return;
  }
  res.writeHead(200, { "Content-Type": guessMime(path) });
  res.end(readFileSync(full, "utf8"));
}

function guessMime(path: string): string {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;

  if (path === "/health") {
    json(res, { ok: true, time: new Date().toISOString() });
    return;
  }

  // 정적 파일
  if (path === "/" || path === "/index.html") {
    serveFile(res, "src/web/index.html");
    return;
  }
  if (path === "/app.js") {
    serveFile(res, "src/web/app.js");
    return;
  }
  if (path === "/styles.css") {
    serveFile(res, "src/web/styles.css");
    return;
  }

  // API
  if (req.method === "GET" && path === "/api/themes") {
    json(res, {
      themes: THEMES.map((t) => ({
        id: t.id,
        name: t.name,
        companies: companiesForTheme(t.id).map((c) => ({ id: c, name: companyName(c) })),
      })),
    });
    return;
  }

  if (req.method === "GET" && path === "/api/fixture") {
    const companyId = url.searchParams.get("companyId");
    if (!companyId) {
      badRequest(res, "companyId가 필요합니다");
      return;
    }
    const fixture = MARKET_SCENE_FIXTURES.find((f) => f.companyId === companyId);
    if (!fixture) {
      notFound(res);
      return;
    }
    json(res, fixture);
    return;
  }

  if (req.method === "GET" && path === "/api/learning/reconnection") {
    const userId = url.searchParams.get("userId") ?? "demo_user";
    const pastContext = buildPastLearningContext(userId);
    const lensStates = pastContext.lensStates.map((state) => ({
      ...state,
      lensName: lensName(state.lensId),
    }));
    json(res, {
      userId,
      sessions: [],
      lensStates,
      recentSessions: pastContext.recentSessions,
    });
    return;
  }

  if (req.method === "POST" && path === "/api/learning/start") {
    const body = await readBody(req);
    let payload: {
      userId?: string;
      themeId?: string;
      companyId?: string;
    };
    try {
      payload = JSON.parse(body);
    } catch {
      badRequest(res, "JSON 페이로드가 아닙니다");
      return;
    }

    const userId = payload.userId ?? "demo_user";
    const themeId = payload.themeId;
    const companyId = payload.companyId;
    if (!themeId || !companyId) {
      badRequest(res, "themeId와 companyId가 필요합니다");
      return;
    }

    const companies = companiesForTheme(themeId);
    if (!companies.includes(companyId as any)) {
      badRequest(res, "해당 테마에 없는 companyId입니다");
      return;
    }

    const fixture = MARKET_SCENE_FIXTURES.find((f) => f.companyId === companyId);
    if (!fixture) {
      notFound(res);
      return;
    }

    const pastContext = buildPastLearningContext(userId);
    const input = {
      userId,
      companyId: companyId as any,
      marketScene: fixture.scene,
      marketNumbers: fixture.numbers,
      pastContext,
      fixture,
    };

    const turn = await startLearningTurn(input, mockCoachTurn);

    json(res, {
      sessionId: turn.session.id,
      coachMessage: turn.coachMessage,
      isQuestionTurn: turn.isQuestionTurn,
      fixture: {
        companyId: fixture.companyId,
        scene: fixture.scene,
        numbers: fixture.numbers,
        status: fixture.status,
        note: fixture.note,
        mockNote: fixture.mockNote,
      },
    });
    return;
  }

  if (req.method === "POST" && path === "/api/learning/complete") {
    const body = await readBody(req);
    let payload: {
      sessionId?: string;
      userId?: string;
      companyId?: string;
      themeId?: string;
      userJudgment?: string;
      userDecision?: string;
    };
    try {
      payload = JSON.parse(body);
    } catch {
      badRequest(res, "JSON 페이로드가 아닙니다");
      return;
    }

    const sessionId = payload.sessionId;
    const userId = payload.userId ?? "demo_user";
    const companyId = payload.companyId;
    const themeId = payload.themeId;
    const userJudgment = payload.userJudgment ?? "";
    const userDecision = payload.userDecision;

    if (!sessionId || !companyId || !themeId || !userDecision) {
      badRequest(res, "sessionId, companyId, themeId, userDecision이 필요합니다");
      return;
    }

    const companies = companiesForTheme(themeId);
    if (!companies.includes(companyId as any)) {
      badRequest(res, "해당 테마에 없는 companyId입니다");
      return;
    }

    const fixture = MARKET_SCENE_FIXTURES.find((f) => f.companyId === companyId);
    if (!fixture) {
      notFound(res);
      return;
    }

    const pastContext = buildPastLearningContext(userId);

    const result = await completeLearning(
      sessionId,
      pastContext,
      fixture,
      userJudgment,
      userDecision as any,
      mockCoachSummary
    );

    json(res, {
      session: {
        id: result.session.id,
        status: result.session.status,
        lensName: result.session.lensName,
        lensStatusAfter: result.session.lensStatusAfter,
        decisionAction: result.session.decisionAction,
        judgment: result.session.judgment,
      },
      summary: result.summary,
      finalMessage: result.finalMessage,
    });
    return;
  }

  notFound(res);
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
server.listen(PORT, () => {
  console.log(`InvestLens UI 서버 시작: http://localhost:${PORT}`);
  console.log(`  - 테마/학습 API: /api/*`);
  console.log(`  - 프론트: http://localhost:${PORT}/`);
});
