/** InvestLens 브라우저 앱 MVP
 * 테마 선택 -> 시장 장면 확인 -> 관련 사례 -> 코치 질문 -> 판단 입력 -> 결정 -> 저장 -> 재연결 확인
 * 이번 MVP에서는 fixture 기반 시장 장면과 서버 mock coach만 사용한다.
 */

const $ = (sel, root) => (root ?? document).querySelector(sel);

// 코치 응답에 섞여 오는 최소한의 마크다운만 처리한다. escape 후에 변환하므로 안전하다.
function renderCoachText(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[-*]\s+/gm, "· ");
}
const $id = (id) => document.getElementById(id);

let coachEnv = "mock";
function coachEnvLabel() {
  return coachEnv === "real" ? "Solar Pro 코치 연결됨" : "코치 미연결 — 예시 응답";
}
function coachEnvStatus() {
  return coachEnv === "real" ? "Solar Pro 연결됨" : "코치 미연결";
}
const coachBadgeEl = document.getElementById("coachBadge");
if (coachBadgeEl) coachBadgeEl.textContent = coachEnvLabel();

(async () => {
  try {
    const res = await fetch("/api/health");
    if (res.ok) {
      const data = await res.json();
      coachEnv = data.upstageApiKeySet ? "real" : "mock";
      const badge = document.getElementById("coachBadge");
      if (badge) badge.textContent = coachEnvLabel();
      const wsStatusEl = document.querySelector(".ws-status");
      if (wsStatusEl) wsStatusEl.textContent = coachEnvStatus();
    }
  } catch (e) {
    // fetch 실패 시 mock 유지
  }
})();

const SCREENS = new Set([
  "workspace",
  "themes",
  "scene",
  "learning",
  "decision",
  "complete",
  "reconnection",
]);

let state = {
  screen: "workspace",
  phase: "browse",
  selectedTheme: null,
  selectedCompany: null,
  selectedPastSession: null,
  currentSession: null,
  userCompletionOpen: false,
  themes: [],
  reconnectionData: null,
  fixture: null,
  summary: null,
  finalMessage: "",
  leftSidebarOpen: window.matchMedia("(min-width: 761px)").matches,
  rightSidebarOpen: window.matchMedia("(min-width: 761px)").matches,
  reportUsed: false,
};

function render() {
  const root = $id("app");
  if (!root) return;
  root.innerHTML = "";
  document.body.classList.remove("ws-open");

  if (state.screen === "workspace") renderWorkspace(root);
  else if (state.screen === "themes") renderThemes(root);
  else if (state.screen === "scene") renderScene(root);
  else if (state.screen === "learning") renderLearning(root);
  else if (state.screen === "decision") renderDecision(root);
  else if (state.screen === "complete") renderComplete(root);
  else if (state.screen === "reconnection") renderReconnection(root);
}

async function renderWorkspace(root) {
  document.body.classList.add("ws-open");
  root.innerHTML = `
    <section class="ws-shell ${state.leftSidebarOpen ? "" : "left-collapsed"} ${state.rightSidebarOpen ? "" : "right-collapsed"}">
      <div class="ws-header">
        <div class="ws-header-group">
          <button type="button" class="ws-icon-btn" id="wsToggleLeft" aria-label="왼쪽 사이드바 열기 또는 닫기" aria-expanded="${state.leftSidebarOpen}">
            <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2" width="13" height="12" rx="1.5"></rect><path d="M5 2v12"></path></svg>
          </button>
          <div class="ws-brand-dot">IL</div>
          <h1>InvestLens</h1>
        </div>
        <div class="ws-header-group">
          <span class="ws-status">${coachEnvStatus()}</span>
          <button type="button" class="ws-icon-btn" id="wsToggleRight" aria-label="코치 사이드바 열기 또는 닫기" aria-expanded="${state.rightSidebarOpen}">
            <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2" width="13" height="12" rx="1.5"></rect><path d="M11 2v12"></path></svg>
          </button>
        </div>
      </div>
      <div class="ws-body">
        <aside class="ws-panel ws-left" id="workspaceLeft"><div class="loader">학습 맥락을 불러오는 중…</div></aside>
        <main class="ws-central" id="workspaceCenter"><div class="loader">화면을 준비하는 중…</div></main>
        <aside class="ws-right" id="workspaceRight"><div class="ws-coach-panel"><div class="loader">코치 패널을 준비하는 중…</div></div></aside>
      </div>
    </section>
  `;
  bindWorkspaceShellEvents();

  try {
    const [themesData, reconnectionData] = await Promise.all([
      state.themes.length ? Promise.resolve({ themes: state.themes }) : getJSON("/api/themes"),
      state.reconnectionData
        ? Promise.resolve(state.reconnectionData)
        : getJSON("/api/learning/reconnection?userId=demo_user"),
    ]);
    if (state.screen !== "workspace") return;
    state.themes = themesData.themes ?? [];
    state.reconnectionData = reconnectionData;
    paintWorkspace();
  } catch (err) {
    showError(root, "워크스페이스 데이터를 가져오지 못했습니다.", err);
  }
}

function paintWorkspace() {
  const left = $id("workspaceLeft");
  const center = $id("workspaceCenter");
  const right = $id("workspaceRight");
  if (!left || !center || !right) return;

  const recent = state.reconnectionData?.recentSessions ?? [];
  const lenses = state.reconnectionData?.lensStates ?? [];
  left.innerHTML = `
    <section class="ws-section">
      <h2 class="ws-section-title">테마</h2>
      <div class="ws-theme-list">
        ${state.themes.map((theme) => `
          <button type="button" class="ws-theme-item ${state.selectedTheme?.id === theme.id ? "active" : ""}" data-ws-theme="${escapeHtml(theme.id)}">
            ${escapeHtml(theme.name)}
            <div class="ws-theme-meta">${escapeHtml(theme.companies.map((company) => company.name).join(", "))}</div>
          </button>
        `).join("")}
      </div>
    </section>
    <section class="ws-section">
      <h2 class="ws-section-title">과거 학습 노트</h2>
      <div class="ws-note-list">
        ${recent.length ? recent.map((session) => `
          <button type="button" class="ws-note-item ${state.selectedPastSession?.sessionId === session.sessionId ? "active" : ""}" data-ws-session="${escapeHtml(session.sessionId)}">
            ${escapeHtml(session.companyName)} — ${escapeHtml(session.lensName)}로 판단 / ${escapeHtml(session.decisionAction ?? "공부만 함")}
          </button>
        `).join("") : `<div class="ws-empty">아직 저장된 학습이 없습니다. 주제를 골라 첫 학습을 시작해보세요.</div>`}
      </div>
    </section>
    <section class="ws-section">
      <h2 class="ws-section-title">학습한 투자 렌즈 (판단 기준)</h2>
      <div class="ws-lens-list">
        ${lenses.length ? lenses.map((lens) => `
          <div class="ws-lens-item"><span class="ws-lens-name">${escapeHtml(lens.lensName)}</span><span class="ws-lens-status">${escapeHtml(lens.status)}</span></div>
        `).join("") : `<div class="ws-empty">아직 학습한 렌즈가 없습니다.</div>`}
      </div>
    </section>
  `;

  paintWorkspaceCenter(center, recent);
  paintWorkspaceRight(right);
  bindWorkspaceEvents(recent);
}

function paintWorkspaceCenter(center, recent) {
  if (state.selectedPastSession) {
    const note = state.selectedPastSession;
    center.innerHTML = `
      <article class="ws-scene-card">
        <h2 class="ws-scene-title">${escapeHtml(note.companyName)} 학습 노트</h2>
        <div class="ws-note-detail"><div class="ws-note-label">사용한 렌즈 (판단 기준)</div>${escapeHtml(note.lensName)}</div>
        <div class="ws-note-detail"><div class="ws-note-label">판단</div>${escapeHtml(note.judgment)}</div>
        <div class="ws-note-detail"><div class="ws-note-label">결정</div>${escapeHtml(note.decisionAction)}</div>
      </article>
      ${state.phase === "completed" ? workspaceGraph(recent) : ""}
    `;
    return;
  }

  if (!state.selectedTheme) {
    center.innerHTML = `
      <div class="ws-onboarding">
        <ol class="ws-onboarding-steps">
          <li>왼쪽에서 관심 주제를 고릅니다</li>
          <li>코치와 대화하며 시장 장면을 함께 봅니다</li>
          <li>내 판단과 결정을 정리해 노트로 남깁니다</li>
        </ol>
        <p class="ws-onboarding-prompt">지금 왼쪽에서 주제를 하나 골라보세요.</p>
      </div>`;
    return;
  }

  // 학습 완료 상태: 기존처럼 시장 장면 카드 + 그래프
  if (state.phase === "completed") {
    const hasFixture = !!(state.fixture?.scene);
    center.innerHTML = `
      <article class="ws-scene-card">
        <h2 class="ws-scene-title">${escapeHtml(state.selectedTheme.name)}</h2>
        <div class="ws-scene-meta">사례 기업: ${escapeHtml(state.selectedCompany?.name ?? "")}</div>
        ${hasFixture ? `<div class="ws-scene-body">${escapeHtml(state.fixture.scene)}</div>` : `<div class="ws-scene-body"><div class="loader">시장 장면을 불러오는 중…</div></div>`}
        ${state.fixture?.numbers ? `<div class="ws-scene-numbers"><strong>시장 수치</strong>${escapeHtml(state.fixture.numbers)}</div>` : ""}
        ${state.fixture?.mockNote && !state.reportUsed ? `<div class="ws-mock-note"><strong>예시 장면</strong><br>${escapeHtml(state.fixture.mockNote)}</div>` : ""}
      </article>
      ${workspaceGraph(recent)}
    `;
    return;
  }

  // 학습 시작 전: 시장 장면 카드 + 리포트 붙여넣기
  if (!state.currentSession) {
    const hasFixture = !!(state.fixture?.scene);
    center.innerHTML = `
      <article class="ws-scene-card">
        <h2 class="ws-scene-title">${escapeHtml(state.selectedTheme.name)}</h2>
        <div class="ws-scene-meta">사례 기업: ${escapeHtml(state.selectedCompany?.name ?? "")}</div>
        ${hasFixture ? `<div class="ws-scene-body">${escapeHtml(state.fixture.scene)}</div>` : `<div class="ws-scene-body"><div class="loader">시장 장면을 불러오는 중…</div></div>`}
        ${state.fixture?.numbers ? `<div class="ws-scene-numbers"><strong>시장 수치</strong>${escapeHtml(state.fixture.numbers)}</div>` : ""}
        ${state.fixture?.mockNote && !state.reportUsed ? `<div class="ws-mock-note"><strong>예시 장면</strong><br>${escapeHtml(state.fixture.mockNote)}</div>` : ""}
        <div class="ws-report-input">
          <label class="ws-input-group">
            <span class="ws-input-label">기업 리포트 붙여넣기</span>
            <textarea class="ws-textarea" id="wsReportText" placeholder="기업 리포트 텍스트를 여기에 붙여넣으세요. (선택사항)" rows="5"></textarea>
          </label>
          <div class="ws-report-note">입력하면 리포트에서 투자 코치가 쓸 데이터포인트만 자동 추출해 학습에 반영합니다. 입력하지 않으면 기존 시장 장면/수치 기반으로 진행됩니다.</div>
        </div>
        <div class="ws-start-hint">
          <p class="ws-start-hint-line">아래 장면을 읽고 '학습 시작'을 누르면 코치가 질문을 던집니다.</p>
          <p class="ws-start-hint-line">직접 가진 기업 리포트가 있다면 붙여넣어도 됩니다. 붙여넣으면 그 내용으로 학습합니다.</p>
        </div>
      </article>
    `;
    return;
  }

  // 학습 중: 접을 수 있는 시장 장면 + 대화 목록 + 답변 입력창
  const turns = state.currentSession.turns ?? [];
  const chatHtml = turns.length
    ? turns.map((turn) => {
        const isCoach = turn.role === "coach";
        return `<div class="ws-chat-turn ${isCoach ? "coach" : "user"}">
          <div class="ws-chat-label">${isCoach ? "코치" : "나"}</div>
          <div class="ws-chat-bubble">${isCoach ? renderCoachText(turn.content) : escapeHtml(turn.content)}</div>
        </div>`;
      }).join("")
    : `<div class="ws-coach-message placeholder">대화가 시작되면 여기에 코치의 질문이 표시됩니다.</div>`;

  const hasFixture = !!(state.fixture?.scene);
  center.innerHTML = `
    <div class="ws-center-layout">
      <details class="ws-scene-details">
        <summary class="ws-scene-summary">이번 시장 장면 보기</summary>
        <div class="ws-scene-card">
          <h2 class="ws-scene-title">${escapeHtml(state.selectedTheme.name)}</h2>
          <div class="ws-scene-meta">사례 기업: ${escapeHtml(state.selectedCompany?.name ?? "")}</div>
          ${hasFixture ? `<div class="ws-scene-body">${escapeHtml(state.fixture.scene)}</div>` : `<div class="ws-scene-body"><div class="loader">시장 장면을 불러오는 중…</div></div>`}
          ${state.fixture?.numbers ? `<div class="ws-scene-numbers"><strong>시장 수치</strong>${escapeHtml(state.fixture.numbers)}</div>` : ""}
          ${state.fixture?.mockNote && !state.reportUsed ? `<div class="ws-mock-note"><strong>예시 장면</strong><br>${escapeHtml(state.fixture.mockNote)}</div>` : ""}
        </div>
      </details>
      <div class="ws-chat-area">
        <h2 class="ws-coach-heading">코치 질문</h2>
        <div class="ws-chat-list" id="wsChatList">${chatHtml}</div>
        <div class="ws-answer-input">
          <label class="ws-input-group">
            <span class="ws-input-label">내 답변</span>
            <textarea class="ws-textarea" id="wsUserAnswer" placeholder="코치의 질문에 자유롭게 답해보세요. 정답이 없어도 됩니다."></textarea>
          </label>
          <button class="ws-btn ws-btn-primary" id="wsSendAnswerBtn">답변 보내기</button>
        </div>
      </div>
    </div>
  `;
}

function workspaceGraph(recent) {
  const relatedIds = new Set((state.summary?.relatedPastLearning ?? []).map((item) => item.sessionId));
  const related = recent.filter((session) => relatedIds.has(session.sessionId));
  if (!related.length) return `<div class="ws-graph"><div class="ws-graph-empty">이번 학습과 직접 연결된 과거 노트가 없습니다.</div></div>`;
  const width = 480;
  const step = width / (related.length + 1);
  return `
    <div class="ws-graph">
      <svg viewBox="0 0 ${width} 240" role="img" aria-label="현재 학습과 과거 학습의 연결">
        ${related.map((session, index) => `<line x1="240" y1="48" x2="${step * (index + 1)}" y2="178" class="ws-edge solid" />`).join("")}
        <g class="ws-node active" transform="translate(240 48)"><circle r="18"></circle><text text-anchor="middle" y="34">현재 학습</text></g>
        ${related.map((session, index) => `
          <g class="ws-node" data-ws-node="${escapeHtml(session.sessionId)}" transform="translate(${step * (index + 1)} 178)" tabindex="0" role="button">
            <circle r="16"></circle><text text-anchor="middle" y="32">${escapeHtml(session.companyName)}</text>
          </g>
        `).join("")}
      </svg>
    </div>
  `;
}

function paintWorkspaceRight(right) {
  if (!state.selectedTheme) {
    right.innerHTML = `<div class="ws-coach-panel"><h2 class="ws-coach-heading">코치</h2><div class="ws-coach-message placeholder">테마를 선택하면 학습 패널이 활성화됩니다.</div></div>`;
    return;
  }
  if (state.phase === "completed") {
    const summary = state.summary ?? {};
    right.innerHTML = `
      <div class="ws-summary"><h2 class="ws-summary-title">학습 완료</h2>
        <div class="ws-summary-grid">
          <div class="ws-summary-item"><div class="ws-summary-label">렌즈 (판단 기준)</div><div class="ws-summary-value">${escapeHtml(summary.lensName ?? summary.lensUsed ?? "-")}</div></div>
          <div class="ws-summary-item"><div class="ws-summary-label">상태</div><div class="ws-summary-value">${escapeHtml(summary.lensStatusAfter ?? "-")}</div></div>
          <div class="ws-summary-item"><div class="ws-summary-label">판단</div><div class="ws-summary-value">${escapeHtml(summary.judgment ?? "-")}</div></div>
          <div class="ws-summary-item"><div class="ws-summary-label">결정</div><div class="ws-summary-value">${escapeHtml(summary.decisionAction ?? "-")}</div></div>
        </div><div class="ws-final">${escapeHtml(state.finalMessage)}</div>
        <div class="ws-storage-note">이 학습은 왼쪽 '과거 학습 노트'에 저장됩니다. 다음 학습에서 코치가 이 기록을 참고합니다.</div>
      </div>`;
    return;
  }
  if (!state.currentSession) {
    right.innerHTML = `<div class="ws-coach-panel"><h2 class="ws-coach-heading">코치</h2><div class="ws-coach-message placeholder">시장 장면을 확인한 뒤 학습을 시작하세요.</div><button class="ws-btn ws-btn-primary" id="wsStartBtn" ${state.fixture ? "" : "disabled"}>학습 시작</button></div>`;
    return;
  }
  const readyToComplete = state.currentSession.readyToComplete === true;

  right.innerHTML = `
    <div class="ws-coach-panel">
      <h2 class="ws-coach-heading">코치 질문</h2>
      ${!state.currentSession ? "" : `<div class="ws-learn-hint">대화를 충분히 나누면 오른쪽의 '판단 정리하고 끝내기'로 마무리합니다.</div>`}
      <div class="ws-completion-bar">
        <button class="ws-btn ws-btn-ghost ws-collapse-btn" id="wsCompletionToggle" type="button">
          ${readyToComplete ? "판단 정리하기" : "판단 정리하고 끝내기"}
        </button>
      </div>
      <div class="ws-completion-panel" id="wsCompletionPanel" hidden>
        <label class="ws-input-group"><span class="ws-input-label">내 판단</span><textarea class="ws-textarea" id="wsJudgment" placeholder="이 장면을 어떻게 판단했나요?"></textarea><div class="ws-field-hint">이 장면을 어떻게 봤는지 내 문장으로 적어보세요.</div></label>
        <div class="ws-decision-hint">지금 시점의 결정을 고르세요. 실제 투자 여부와 무관합니다.</div>
        <div class="ws-decision-options" id="wsDecisions">
          ${["투자함", "투자하지 않음", "공부만 함"].map((decision) => `<label class="ws-decision-option"><input type="radio" name="wsDecision" value="${decision}">${decision}</label>`).join("")}
        </div>
        <button class="ws-btn ws-btn-primary" id="wsCompleteBtn" disabled>저장 후 학습 완료</button>
        <button class="ws-btn ws-btn-ghost" id="wsCompletionCancel" type="button">닫기</button>
      </div>
      ${!readyToComplete ? `
        <div class="ws-coach-message placeholder">대화를 이어가세요. 답변을 보내고 코치의 피드백을 확인하세요.</div>
      ` : ""}
    </div>`;
}

function bindWorkspaceEvents(recent) {
  document.querySelectorAll("[data-ws-theme]").forEach((button) => button.addEventListener("click", async () => {
    const theme = state.themes.find((item) => item.id === button.dataset.wsTheme);
    if (!theme) return;
    state.selectedTheme = theme;
    state.selectedCompany = theme.companies[0];
    state.selectedPastSession = null;
    state.currentSession = null;
    state.summary = null;
    state.finalMessage = "";
    state.phase = "learning";
    state.fixture = null;
    state.reportUsed = false;
    if (window.matchMedia("(max-width: 760px)").matches) {
      state.leftSidebarOpen = false;
      syncWorkspacePanels();
    }
    paintWorkspace();
    const selectedCompanyId = state.selectedCompany.id;
    try {
      const fixture = await getJSON(`/api/fixture?companyId=${encodeURIComponent(selectedCompanyId)}`);
      if (state.selectedCompany?.id !== selectedCompanyId) return;
      state.fixture = fixture;
      paintWorkspace();
    } catch (err) {
      showError($id("app"), "시장 장면을 가져오지 못했습니다.", err);
    }
  }));

  document.querySelectorAll("[data-ws-session], [data-ws-node]").forEach((element) => {
    const selectSession = () => {
      state.selectedPastSession = recent.find((session) => session.sessionId === (element.dataset.wsSession ?? element.dataset.wsNode)) ?? null;
      document.querySelectorAll("[data-ws-session]").forEach((item) => {
        item.classList.toggle("active", item.dataset.wsSession === state.selectedPastSession?.sessionId);
      });
      if (window.matchMedia("(max-width: 760px)").matches) {
        state.leftSidebarOpen = false;
        syncWorkspacePanels();
      }
      const center = $id("workspaceCenter");
      if (center) paintWorkspaceCenter(center, recent);
    };
    element.addEventListener("click", selectSession);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectSession();
      }
    });
  });

  $id("wsStartBtn")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "시작하는 중…";
    try {
      const reportText = ($id("wsReportText")?.value ?? "").trim();
      const result = await postJSON("/api/learning/start", {
        userId: "demo_user",
        themeId: state.selectedTheme.id,
        companyId: state.selectedCompany.id,
        reportText: reportText || undefined,
      });
      if (reportText) state.reportUsed = true;
      state.currentSession = {
        sessionId: result.sessionId,
        turns: [
          { role: "coach", content: result.coachMessage, createdAt: new Date().toISOString() },
        ],
        readyToComplete: result.isQuestionTurn ? false : true,
      };
      state.fixture = result.fixture ?? state.fixture;
      paintWorkspace();
    } catch (err) {
      showError($id("app"), "학습 시작 중 오류가 발생했습니다.", err);
    }
  });

  const sendAnswerBtn = $id("wsSendAnswerBtn");
  const userAnswerTextarea = $id("wsUserAnswer");
  sendAnswerBtn?.addEventListener("click", async () => {
    const answer = (userAnswerTextarea?.value ?? "").trim();
    if (!answer || !state.currentSession) return;
    sendAnswerBtn.disabled = true;
    sendAnswerBtn.textContent = "답변 중…";
    try {
      const result = await postJSON("/api/learning/respond", {
        sessionId: state.currentSession.sessionId,
        userAnswer: answer,
      });
      state.currentSession = {
        ...state.currentSession,
        turns: result.turns ?? [],
        readyToComplete: result.readyToComplete === true,
      };
      if (userAnswerTextarea) userAnswerTextarea.value = "";
      paintWorkspace();
      const chatList = $id("wsChatList");
      if (chatList) chatList.scrollTop = chatList.scrollHeight;
    } catch (err) {
      showError($id("app"), "코치 응답을 가져오지 못했습니다.", err);
    } finally {
      if (sendAnswerBtn) { sendAnswerBtn.disabled = false; sendAnswerBtn.textContent = "답변 보내기"; }
    }
  });

  const judgment = $id("wsJudgment");
  const completeButton = $id("wsCompleteBtn");
  if (judgment && completeButton) {
    const updateCompleteButton = () => {
      const decision = document.querySelector('input[name="wsDecision"]:checked');
      completeButton.disabled = !judgment.value.trim() || !decision;
    };
    judgment.addEventListener("input", updateCompleteButton);
    document.querySelectorAll('input[name="wsDecision"]').forEach((radio) => radio.addEventListener("change", updateCompleteButton));
    completeButton.addEventListener("click", async () => {
      const decision = document.querySelector('input[name="wsDecision"]:checked')?.value;
      if (!decision || !judgment.value.trim()) return;
      completeButton.disabled = true;
      completeButton.textContent = "저장 중…";
      try {
        const result = await postJSON("/api/learning/complete", {
          sessionId: state.currentSession.sessionId, userId: "demo_user", companyId: state.selectedCompany.id,
          themeId: state.selectedTheme.id, userJudgment: judgment.value.trim(), userDecision: decision,
        });
        state.phase = "completed";
        state.summary = result.summary;
        state.finalMessage = result.finalMessage;
        state.selectedPastSession = null;
        state.reconnectionData = await getJSON("/api/learning/reconnection?userId=demo_user");
        paintWorkspace();
      } catch (err) {
        showError($id("app"), "학습 완료 중 오류가 발생했습니다.", err);
      }
    });
  }

  const completionToggle = $id("wsCompletionToggle");
  const completionPanel = $id("wsCompletionPanel");
  const completionCancel = $id("wsCompletionCancel");
  if (completionToggle && completionPanel && completionCancel) {
    completionToggle.addEventListener("click", () => {
      const open = !completionPanel.hasAttribute("hidden");
      completionPanel.toggleAttribute("hidden", open);
      completionToggle.textContent = open ? (state.currentSession?.readyToComplete === true ? "판단 정리하기" : "판단 정리하고 끝내기") : "닫기";
    });
    completionCancel.addEventListener("click", () => {
      completionPanel.setAttribute("hidden", "");
      completionToggle.textContent = state.currentSession?.readyToComplete === true ? "판단 정리하기" : "판단 정리하고 끝내기";
    });
    if (state.currentSession?.readyToComplete === true) {
      completionPanel.toggleAttribute("hidden", false);
      completionToggle.textContent = "판단 정리하기";
    }
  }
}

function bindWorkspaceShellEvents() {
  $id("wsToggleLeft")?.addEventListener("click", () => {
    state.leftSidebarOpen = !state.leftSidebarOpen;
    syncWorkspacePanels();
  });
  $id("wsToggleRight")?.addEventListener("click", () => {
    state.rightSidebarOpen = !state.rightSidebarOpen;
    syncWorkspacePanels();
  });
}

function syncWorkspacePanels() {
  const shell = $(".ws-shell");
  if (!shell) return;
  shell.classList.toggle("left-collapsed", !state.leftSidebarOpen);
  shell.classList.toggle("right-collapsed", !state.rightSidebarOpen);
  $id("wsToggleLeft")?.setAttribute("aria-expanded", String(state.leftSidebarOpen));
  $id("wsToggleRight")?.setAttribute("aria-expanded", String(state.rightSidebarOpen));
}

function renderThemes(root) {
  root.innerHTML = `
    <section class="page themes-page">
      <div class="page-head">
        <h1>테마 탐색</h1>
        <p class="lead">InvestLens는 <strong>기업 선택</strong>이 아니라 <strong>테마 중심</strong>으로 투자 개념을 배우는 서비스입니다. 테마를 고르면 현재 시장 장면과 관련 기업 사례를 함께 볼 수 있습니다.</p>
      </div>
      <div class="theme-grid" id="themeGrid"></div>
      <div class="page-foot">
        <div class="note">
          <span class="note-label">참고</span>
          <span>이 MVP에서는 테마별로 하나의 대표 기업 사례를 기준으로 학습합니다. 기업은 필수 선택 단계가 아니며, 테마 이해를 돕는 사례 데이터로 사용합니다.</span>
        </div>
      </div>
    </section>
  `;

  getJSON("/api/themes")
    .then((data) => {
      const grid = $id("themeGrid");
      if (!grid) return;

      for (const t of data.themes) {
        const card = document.createElement("article");
        card.className = "theme-card";
        const companyNames = t.companies.map((c) => c.name).join(", ");
        card.innerHTML = `
          <div class="theme-id">${t.id}</div>
          <h2>${t.name}</h2>
          <div class="theme-meta">관련 사례: ${companyNames}</div>
          <p class="theme-desc">이 테마를 배우면 시장의 기대와 실제의 차이, 기업 사례와 분산 관점 등을 함께 익힐 수 있습니다.</p>
          <button type="button" class="btn btn-primary" data-theme="${t.id}">
            ${t.name} 학습 시작하기
          </button>
        `;
        grid.appendChild(card);
      }

      grid.querySelectorAll("button[data-theme]").forEach((btn) => {
        btn.addEventListener("click", () => {
          enterTheme(btn.dataset.theme);
        });
      });
    })
    .catch((err) => showError(root, "테마 목록을 가져오지 못했습니다.", err));
}

async function enterTheme(themeId) {
  const themes = await getJSON("/api/themes");
  const theme = themes.themes.find((t) => t.id === themeId);
  if (!theme) throw new Error(`테마를 찾을 수 없습니다: ${themeId}`);

  state = {
    screen: "scene",
    themeId,
    themeName: theme.name,
    companyId: theme.companies[0].id,
    companyName: theme.companies[0].name,
  };
  render();
}

function renderScene(root) {
  const { themeId, themeName, companyId, companyName } = state;
  root.innerHTML = `
    <section class="page scene-page">
      <div class="bread">
        <a href="#" data-back="themes">테마 탐색</a>
        <span>/</span>
        <span>${escapeHtml(themeName)}</span>
      </div>
      <div class="page-head">
        <h1>${escapeHtml(themeName)} 학습</h1>
        <p class="lead">먼저 현재 시장 장면을 확인하고, 테마를 설명하기 위한 관련 기업 사례를 봅니다.</p>
      </div>
      <div class="scene-card">
        <div class="scene-header">
          <span class="scene-label">현재 시장 장면</span>
          <span class="company-tag">사례 기업: ${escapeHtml(companyName)}</span>
        </div>
        <div class="scene-body" id="sceneBody">
          <div class="loader">시장 장면을 불러오는 중…</div>
        </div>
        <div class="scene-footer" id="sceneFixtureNote"></div>
      </div>
      <div class="scene-actions">
        <button type="button" class="btn btn-primary" id="startLearningBtn">
          장면 확인 후 학습 시작
        </button>
        <button type="button" class="btn btn-ghost" data-back="themes">다른 테마 보기</button>
      </div>
    </section>
  `;

  $id("sceneBody").innerHTML = `<div class="loader">시장 장면을 불러오는 중…</div>`;
  $id("sceneFixtureNote").innerHTML = "";

  getJSON(`/api/fixture?companyId=${encodeURIComponent(companyId)}`)
    .then((fixture) => {
      const body = $id("sceneBody");
      if (!body) return;
      body.innerHTML = `
        <div class="scene-scene">${escapeHtml(fixture.scene)}</div>
        <div class="scene-numbers"><strong>시장 수치</strong><br>${escapeHtml(fixture.numbers)}</div>
      `;

      const note = $id("sceneFixtureNote");
      if (!note) return;
      if (fixture.mockNote) {
        note.innerHTML = `
          <div class="mock-flag">
            <span class="mock-flag-label">예시 장면</span>
            <span>${escapeHtml(fixture.mockNote)}</span>
          </div>
          ${fixture.note ? `<div class="scene-note">${escapeHtml(fixture.note)}</div>` : ""}
        `;
      } else if (fixture.note) {
        note.innerHTML = `<div class="scene-note">${escapeHtml(fixture.note)}</div>`;
      }
    })
    .catch((err) => {
      const body = $id("sceneBody");
      if (body) body.innerHTML = `<div class="error">시장 장면을 가져오지 못했습니다.</div>`;
      showError(root, "장면 로드 실패", err);
    });

  $id("startLearningBtn").addEventListener("click", () => {
    startLearning(themeId, companyId, companyName);
  });
}

function renderLearning(root) {
  const session = state.currentSession;
  const { themeName, companyName } = state;

  root.innerHTML = `
    <section class="page learning-page">
      <div class="bread">
        <a href="#" data-back="themes">테마 탐색</a>
        <span>/</span>
        <span>${escapeHtml(themeName)}</span>
        <span>/</span>
        <span>학습 중</span>
      </div>
      <div class="page-head">
        <h1>지금 배울 투자 개념</h1>
        <p class="lead">코치와 주고받은 대화를 아래 목록에서 확인할 수 있습니다.</p>
      </div>
      <div class="panel">
        <div class="panel-head">
          <span class="panel-label">📍 현재 시장 장면</span>
          <span class="company-tag">사례: ${escapeHtml(companyName)}</span>
        </div>
        <div class="panel-body">
          <div class="panel-row">
            <div class="panel-field">
              <span class="field-label">장면</span>
              <div class="field-value">${escapeHtml(session?.marketScene ?? "")}</div>
            </div>
            <div class="panel-field">
              <span class="field-label">시장 수치</span>
              <div class="field-value mono">${escapeHtml(session?.marketNumbers ?? "")}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <span class="panel-label">🎯 코치 대화</span>
        </div>
        <div class="panel-body">
          <div class="chat-list" id="chatList" style="max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding:4px 0;"></div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <textarea id="wsUserAnswer" class="ws-textarea" rows="3" placeholder="코치의 질문에 답변해 주세요." style="flex:1;"></textarea>
            <button id="wsSendAnswer" class="ws-btn ws-btn-primary">답변 보내기</button>
          </div>
        </div>
      </div>
      <div class="scene-actions">
        <button type="button" class="btn btn-primary" id="toDecisionBtn">
          내 판단 입력하기
        </button>
        <button type="button" class="btn btn-ghost" data-back="scene">장면 다시 보기</button>
      </div>
    </section>
  `;

  renderChatList();

  $id("wsSendAnswer")?.addEventListener("click", async () => {
    const answer = ($id("wsUserAnswer")?.value ?? "").trim();
    if (!answer) return;
    const btn = $id("wsSendAnswer");
    const textarea = $id("wsUserAnswer");
    btn.disabled = true;
    btn.textContent = "답변 중…";
    try {
      const result = await postJSON("/api/learning/respond", {
        sessionId: session?.sessionId,
        userAnswer: answer,
      });
      if (session) {
        state.currentSession = {
          ...session,
          turns: (session.turns ?? []).concat(result.turns ?? []),
          coachMessage: result.coachMessage ?? (result.turns?.find((t) => t.role === "coach")?.content ?? session.coachMessage ?? ""),
          readyToComplete: result.readyToComplete ?? session.readyToComplete ?? false,
        };
      }
      if (textarea) textarea.value = "";
      renderChatList();
    } catch (err) {
      showError($id("app"), "코치 응답을 가져오지 못했습니다.", err);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "답변 보내기"; }
    }
  });

  $id("toDecisionBtn")?.addEventListener("click", () => {
    state = { screen: "decision", sessionId: session?.sessionId, themeId: state.themeId, themeName, companyId: state.companyId, companyName };
    render();
  });
}

function renderChatMessage(turn) {
  const isCoach = turn.role === "coach";
  const label = isCoach ? "코치" : "나";
  const wrapperStyle = "display:flex;justify-content:" + (isCoach ? "flex-start" : "flex-end") + ";padding:2px 0;";
  const textStyle =
    "display:flex;flex-direction:column;max-width:88%;padding:8px 12px;border-radius:10px;line-height:1.5;word-break:break-word;align-self:" +
    (isCoach ? "flex-start" : "flex-end") +
    ";background:" + (isCoach ? "#eef3fb" : "#e9eef5") + ";color:#1f2a44;border-bottom-" + (isCoach ? "left" : "right") + "-radius:4px;";
  return `<div style="${wrapperStyle}"><span style="font-size:12px;color:#6b7280;align-self:center;margin-right:6px;">${escapeHtml(label)}</span><div style="${textStyle}">${escapeHtml(turn.content)}</div></div>`;
}

function renderChatList() {
  const chatList = $id("chatList");
  if (!chatList) return;
  const session = state.currentSession;
  chatList.innerHTML = session?.turns?.length
    ? session.turns.map(renderChatMessage).join("")
    : `<div class="chat-empty" style="padding:8px;color:#6b7280;">아직 대화가 없습니다. 학습을 시작하면 코치의 질문이 표시됩니다.</div>`;
}

function renderDecision(root) {
  const { sessionId, themeId, themeName, companyId, companyName } = state;
  root.innerHTML = `
    <section class="page decision-page">
      <div class="bread">
        <a href="#" data-back="themes">테마 탐색</a>
        <span>/</span>
        <span>${escapeHtml(themeName)}</span>
        <span>/</span>
        <span>판단 입력</span>
      </div>
      <div class="page-head">
        <h1>내 판단 입력</h1>
        <p class="lead">장면을 보고 든 생각과 최종 결정을 기록합니다.</p>
      </div>
      <div class="panel">
        <div class="panel-head">
          <span class="panel-label">내가 판단한 내용</span>
        </div>
        <div class="panel-body">
          <label class="field">
            <span>판단 메모</span>
            <textarea id="judgmentInput" rows="4" placeholder="이 장면에서 내가 이렇게 생각했다…"></textarea>
          </label>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <span class="panel-label">결정</span>
        </div>
        <div class="panel-body">
          <div class="decision-options" id="decisionOptions">
            <label class="decision-option">
              <input type="radio" name="decision" value="투자함" />
              <span class="decision-label">투자함</span>
            </label>
            <label class="decision-option">
              <input type="radio" name="decision" value="투자하지 않음" />
              <span class="decision-label">투자하지 않음</span>
            </label>
            <label class="decision-option">
              <input type="radio" name="decision" value="공부만 함" />
              <span class="decision-label">공부만 함</span>
            </label>
          </div>
        </div>
      </div>
      <div class="scene-actions">
        <button type="button" class="btn btn-primary" id="saveDecisionBtn" disabled>
          저장 후 학습 완료
        </button>
        <button type="button" class="btn btn-ghost" id="backToLearningBtn">
          학습 화면으로 돌아가기
        </button>
      </div>
    </section>
  `;

  const decisionRadios = $id("decisionOptions").querySelectorAll('input[name="decision"]');
  const saveBtn = $id("saveDecisionBtn");
  const backBtn = $id("backToLearningBtn");

  decisionRadios.forEach((r) => {
    r.addEventListener("change", () => {
      saveBtn.disabled = !r.checked;
    });
  });

  saveBtn.addEventListener("click", async () => {
    const judgmentInput = $id("judgmentInput");
    const judgment = judgmentInput ? judgmentInput.value.trim() : "";
    if (!judgment) {
      alert("판단 메모를 입력해 주세요.");
      return;
    }
    const checked = document.querySelector('input[name="decision"]:checked');
    const decision = checked ? checked.value : null;
    if (!decision) return;

    saveBtn.disabled = true;
    saveBtn.textContent = "저장 중…";

    try {
      const result = await postJSON("/api/learning/complete", {
        sessionId,
        userId: "demo_user",
        companyId,
        themeId,
        userJudgment: judgment,
        userDecision: decision,
      });
      state = {
        screen: "complete",
        sessionId,
        finalMessage: result.finalMessage,
        summary: result.summary,
      };
      render();
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = "저장 후 학습 완료";
      showError(root, "학습 완료 중 오류가 발생했습니다.", err);
    }
  });

  backBtn.addEventListener("click", () => {
    state = { screen: "learning", sessionId, themeId, themeName, companyId, companyName, marketScene: "", marketNumbers: "", coachMessage: "" };
    render();
  });
}

function renderComplete(root) {
  const { sessionId, finalMessage, summary } = state;
  const lensName = summary?.lensName ?? "기대 vs 실제";
  const lensStatus = summary?.lensStatusAfter ?? "적용해봄";
  const decision = summary?.decisionAction ?? "공부만 함";
  const judgment = summary?.judgment ?? "";

  root.innerHTML = `
    <section class="page complete-page">
      <div class="bread">
        <a href="#" data-back="themes">테마 탐색</a>
        <span>/</span>
        <span>학습 완료</span>
      </div>
      <div class="page-head">
        <h1>학습 완료</h1>
        <p class="lead">이번 학습 결과를 저장했습니다.</p>
      </div>
      <div class="complete-summary">
        <div class="complete-badge">
          <span class="complete-title">이번 학습 요약</span>
        </div>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">사용한 렌즈 (판단 기준)</span>
            <span class="summary-value">${escapeHtml(lensName)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">렌즈 이해도</span>
            <span class="summary-value">${escapeHtml(lensStatus)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">내 판단</span>
            <span class="summary-value">${escapeHtml(judgment)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">결정</span>
            <span class="summary-value">${escapeHtml(decision)}</span>
          </div>
        </div>
        <div class="final-message">
          <h2>정리</h2>
          <pre>${escapeHtml(finalMessage)}</pre>
        </div>
      </div>
      <div class="scene-actions">
        <button type="button" class="btn btn-primary" id="newLearningBtn">
          새로운 학습 시작
        </button>
        <button type="button" class="btn btn-ghost" id="reconnectionBtn">
          이전 학습 재연결 확인
        </button>
        <button type="button" class="btn btn-ghost" id="workspaceBtn">
          워크스페이스 보기
        </button>
      </div>
   </section>
  `;

  $id("newLearningBtn").addEventListener("click", () => {
    state = { screen: "themes" };
    render();
  });

  $id("reconnectionBtn").addEventListener("click", () => {
    state = { screen: "reconnection" };
    render();
  });

  $id("workspaceBtn").addEventListener("click", () => {
    state = {
      screen: "workspace",
      lastSessionId: sessionId,
      lastSummary: summary,
      lastFixture: state.lastFixture ?? null,
      lastCompanyName: state.lastCompanyName ?? null,
    };
    render();
  });
}

function renderReconnection(root) {
  root.innerHTML = `
    <section class="page reconnection-page">
      <div class="bread">
        <a href="#" data-back="themes">테마 탐색</a>
        <span>/</span>
        <span>이전 학습 재연결</span>
      </div>
      <div class="page-head">
        <h1>이전 학습 재연결</h1>
        <p class="lead">이전에 학습한 개념이나 판단이 새로운 학습에 어떻게 다시 연결되는지 확인합니다.</p>
      </div>
      <div class="reconnection-body" id="reconnectionBody">
        <div class="loader">이전 학습 정보를 불러오는 중…</div>
      </div>
      <div class="scene-actions">
        <button type="button" class="btn btn-primary" id="backToThemesBtn">
          테마 탐색으로 돌아가기
        </button>
      </div>
    </section>
  `;

  getJSON("/api/learning/reconnection")
    .then((data) => {
      const body = $id("reconnectionBody");
      if (!body) return;
      const recent = data.recentSessions ?? [];
      const lensStates = data.lensStates ?? [];

      if (!recent.length) {
        body.innerHTML = `
          <div class="note">
            <span class="note-label">현재</span>
            <span>이전 학습 기록이 아직 없습니다. 첫 테마 학습을 시작해 보세요.</span>
          </div>
        `;
        return;
      }

      let html = `
        <div class="reconnection-section">
          <h2>최근 학습한 세션</h2>
          <ul class="session-list">
      `;

      for (const s of recent) {
        html += `
          <li class="session-item">
            <div class="session-item-head">
              <span class="session-company">${escapeHtml(s.companyName)}</span>
              <span class="session-status">${escapeHtml(s.status)}</span>
            </div>
            <div class="session-item-detail">
              <span class="session-lens">사용한 렌즈 (판단 기준): ${escapeHtml(s.lensName)}</span>
              <span class="session-judgment">판단: ${escapeHtml(s.judgment)}</span>
              <span class="session-decision">결정: ${escapeHtml(s.decisionAction)}</span>
            </div>
          </li>
        `;
      }

      html += `</ul></div>`;

      if (lensStates.length) {
        html += `
          <div class="reconnection-section">
            <h2>익힌 렌즈 상태 (판단 기준)</h2>
            <ul class="lens-list">
        `;
        for (const e of lensStates) {
          html += `
            <li class="lens-item">
              <span class="lens-name">${escapeHtml(e.lensName)}</span>
              <span class="lens-status">${escapeHtml(e.status)}</span>
            </li>
          `;
        }
        html += `</ul></div>`;
      }

      body.innerHTML = html;
    })
    .catch((err) => showError(root, "이전 학습 정보를 가져오지 못했습니다.", err));

  $id("backToThemesBtn").addEventListener("click", () => {
    state = { screen: "themes" };
    render();
  });
}

function showError(root, message, err) {
  if (state.screen === "workspace") {
    const center = $id("workspaceCenter");
    if (center) {
      center.innerHTML = `
        <section class="ws-error" role="alert">
          <div class="ws-error-icon">!</div>
          <h2>화면을 불러오지 못했습니다</h2>
          <p>${escapeHtml(message)}</p>
          <details>
            <summary>오류 상세</summary>
            <pre>${escapeHtml(err instanceof Error ? err.message : String(err))}</pre>
          </details>
          <button type="button" class="ws-btn" id="retryWorkspaceBtn">다시 시도</button>
        </section>
      `;
      $id("retryWorkspaceBtn")?.addEventListener("click", render);
      return;
    }
  }

  root.innerHTML = `
    <section class="page error-page">
      <h1>오류</h1>
      <p class="error-message">${escapeHtml(message)}</p>
      <details>
        <summary>오류 상세</summary>
        <pre>${escapeHtml(err instanceof Error ? err.message : String(err))}</pre>
      </details>
      <div class="scene-actions">
        <button type="button" class="btn btn-primary" id="retryBtn">처음으로 돌아가기</button>
      </div>
    </section>
  `;
  $id("retryBtn").addEventListener("click", () => {
    state = { screen: "themes" };
    render();
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getJSON(path) {
  return fetch(path).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API 오류(${res.status}): ${text}`);
    }
    return res.json();
  });
}

function postJSON(path, payload) {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API 오류(${res.status}): ${text}`);
    }
    return res.json();
  });
}

async function startLearning(themeId, companyId, companyName) {
  sessionStorage.setItem("lastTheme", themeId);

  try {
    const result = await postJSON("/api/learning/start", {
      userId: "demo_user",
      themeId,
      companyId,
    });

    state = {
      screen: "learning",
      themeId,
      themeName: state.themeName ?? themeId,
      companyId,
      companyName,
      currentSession: {
        sessionId: result.sessionId,
        turns: [{
          role: "coach",
          content: result.coachMessage,
          createdAt: new Date().toISOString(),
        }],
        marketScene: result.fixture?.scene ?? "",
        marketNumbers: result.fixture?.numbers ?? "",
        coachMessage: result.coachMessage ?? "",
        readyToComplete: result.readyToComplete ?? false,
      },
    };

    render();
  } catch (err) {
    showError($id("app"), "학습 시작 중 오류가 발생했습니다.", err);
  }
}

document.addEventListener("click", (e) => {
  const target = e.target;
  const backBtn = target?.closest("[data-back]");
  if (backBtn) {
    const targetId = backBtn.getAttribute("data-back");
    e.preventDefault();
    if (targetId === "themes") {
      state = { screen: "themes" };
    } else {
      state = { screen: targetId };
    }
    render();
  }
});

window.addEventListener("pageshow", () => {
  render();
});
