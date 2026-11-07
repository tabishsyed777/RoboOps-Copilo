const API_BASE = String(window.ROBOOPS_CONFIG?.apiBase || "").replace(/\/$/, "");
const chatForm = document.querySelector("#chat-form");
const question = document.querySelector("#question");
const chatWindow = document.querySelector("#chat-window");
const toast = document.querySelector("#toast");
const pending = new Map();
let toastTimer;

const demoDocs = [
  { title: "Aster-6 maintenance quick guide", source: "knowledge/aster6_maintenance.md", type: "MD", text: "When Aster-6 is idle, check the cell status panel, controller event log, and work area. A paused cycle can be caused by a protective stop, open guard, gripper fault, or upstream conveyor request. Record the displayed fault code before acknowledging it. Normal simulated joint temperature is 20–55 °C. At 56–65 °C, pause the next cycle and inspect joint load, payload setting, and controller airflow. Above 65 °C, leave the cell stopped and request maintenance review. Restart only after confirming the work area is clear, end effector secure, guard circuit closed, and no unresolved fault. Restart at reduced speed while watching the first motion." },
  { title: "Line-02 conveyor operating procedure", source: "knowledge/conveyor_line_sop.md", type: "MD", text: "If the tracking sensor reports drift, stop the belt through the operator panel and inspect for debris around rollers. Do not reach into the conveyor while energized. Use the designated local isolator and verify zero movement before clearing a jam. Persistent tracking warning requires maintenance ticket; operators should not change roller alignment. Training simulator motor load normally 35% to 75%. Sustained above 85% or sudden jump over 15 percentage points triggers controlled stop and inspection. Never bypass an interlock to restore throughput." },
  { title: "Robotics cell safety policy", source: "knowledge/cell_safety_policy.md", type: "MD", text: "If a person enters a safeguarded area or cell state is uncertain, keep equipment stopped and notify the area supervisor. Do not enter a robot work envelope to inspect a fault. Use approved energy-control and lockout process before maintenance access. The copilot may search procedures, summarize logs, inspect simulated telemetry, and prepare proposed action for operator review. It must not issue motion commands, clear safety faults, bypass interlocks, change speed limits, or restart a physical robot. Every action proposal must identify its source and remain pending until operator review." },
];
const robots = [
  { id: "Aster-6", title: "Aster-6 maintenance quick guide", state: "Ready", temp: 38 },
  { id: "Line-02", title: "Line-02 conveyor operating procedure", state: "Running", load: 61 },
  { id: "Inspect-01", title: "Robotics cell safety policy", state: "Review", fault: "Calibration review due" },
];

document.querySelector("#clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
setInterval(() => { document.querySelector("#clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }, 15000);

document.querySelectorAll(".prompt-chip").forEach((button) => button.addEventListener("click", () => {
  question.value = button.textContent;
  question.focus();
  chatForm.requestSubmit();
}));

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = question.value.trim();
  if (message.length < 2) return;
  appendUserMessage(message);
  question.value = "";
  const busy = appendThinking();
  document.querySelector("#send-button").disabled = true;
  try {
    const result = API_BASE ? await askBackend(message) : await askBrowserDemo(message);
    busy.remove();
    appendAssistantMessage(result);
    updateModelLabel(result.mode);
    if (result.proposed_action) {
      pending.set(result.proposed_action.id, result.proposed_action);
      renderActions();
      appendActivity("Action proposal awaits review", `${result.proposed_action.action} · ${result.proposed_action.robot_id}`, "action");
    }
    appendActivity("Copilot answer prepared", `${result.citations.length} procedure passages retrieved.`, "agent");
  } catch (error) {
    busy.remove();
    appendAssistantMessage({ answer: `I couldn't reach the RoboOps backend. ${error.message || "Start the local API or use the hosted browser demo."}`, citations: [], agent_steps: ["connection unavailable"], mode: "offline" });
  } finally {
    document.querySelector("#send-button").disabled = false;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});

async function askBackend(message) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, robot_id: "Aster-6" }),
  });
  if (!response.ok) throw new Error(`API returned ${response.status}.`);
  return response.json();
}

async function askBrowserDemo(message) {
  await new Promise((resolve) => setTimeout(resolve, 550));
  const words = new Set(message.toLowerCase().match(/[a-z0-9-]+/g) || []);
  const hits = demoDocs.map((doc) => {
    const content = new Set(doc.text.toLowerCase().match(/[a-z0-9-]+/g) || []);
    let score = 0;
    for (const word of words) if (word.length > 2 && content.has(word)) score += 1;
    return { ...doc, score };
  }).filter((doc) => doc.score).sort((a, b) => b.score - a.score).slice(0, 3);
  if (!hits.length) return { answer: "I couldn't find a matching instruction in the sample procedures. Try a question about Aster-6 temperature, a conveyor tracking warning, or cell safeguards.", citations: [], agent_steps: ["search sample procedures", "no matching source found"], mode: "browser-demo" };
  let answer = `I found relevant guidance for the simulated cell.\n\n${hits.slice(0, 2).map((doc, index) => `**[${index + 1}] ${doc.title}**\n${doc.text.slice(0, 310)}…`).join("\n\n")}\n\nThis is a retrieval-only demo answer. Check the full procedure and have a qualified operator verify the cell before taking action.`;
  let proposal = null;
  const lower = message.toLowerCase();
  if (["suggest", "propose", "what should", "recommend", "create a ticket"].some((phrase) => lower.includes(phrase))) {
    proposal = { id: `ACT-${Math.random().toString(16).slice(2, 8).toUpperCase()}`, action: "request_supervisor_review", rationale: "Review the retrieved procedure and simulated robot status before deciding on maintenance.", source_ids: hits.slice(0, 2).map((doc) => doc.source), robot_id: "Aster-6", status: "pending-review", risk: "Operator review required · simulator only" };
  }
  return { answer, citations: hits.map((doc, index) => ({ index: index + 1, title: doc.title, source: doc.source, score: doc.score, excerpt: doc.text.slice(0, 200) })), agent_steps: ["retrieve procedures", "read simulated robot status", "compose cited response"], proposed_action: proposal, mode: "browser-demo" };
}

function appendUserMessage(message) {
  const item = document.createElement("article");
  item.className = "message user-message";
  item.innerHTML = `<div class="message-body"><p>${escapeHtml(message)}</p></div><span class="user-avatar user-avatar">TS</span>`;
  chatWindow.append(item);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function appendThinking() {
  const item = document.createElement("article");
  item.className = "message assistant-message thinking-message";
  item.innerHTML = `<div class="assistant-avatar">✳</div><div class="message-body"><div class="message-meta"><b>RoboOps Copilot</b><span>working</span></div><p>Retrieving procedures and checking the simulated cell…</p></div>`;
  chatWindow.append(item);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return item;
}

function appendAssistantMessage(result) {
  const item = document.createElement("article");
  item.className = "message assistant-message";
  const citations = (result.citations || []).map((cite) => `<div class="citation"><b>[${cite.index}] ${escapeHtml(cite.title)}</b><small>${escapeHtml(cite.source)} · retrieval score ${escapeHtml(cite.score)}</small></div>`).join("");
  const steps = (result.agent_steps || []).map((step) => `<span class="trace-step">✓ ${escapeHtml(step)}</span>`).join("");
  item.innerHTML = `<div class="assistant-avatar">✳</div><div class="message-body"><div class="message-meta"><b>RoboOps Copilot</b><span>${result.mode === "gemini-agent" ? escapeHtml(result.model || "AI + RAG") : "retrieval demo"}</span></div><p>${escapeHtml(result.answer || "No answer returned.")}</p>${citations ? `<div class="citation-list">${citations}</div>` : ""}${steps ? `<div class="agent-trace">${steps}</div>` : ""}</div>`;
  chatWindow.append(item);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function renderActions() {
  const host = document.querySelector("#actions-list");
  const entries = [...pending.values()].filter((action) => action.status === "pending-review");
  document.querySelector("#pending-count").textContent = String(entries.length);
  if (!entries.length) {
    host.innerHTML = `<div class="empty-action"><span>✓</span><b>Nothing waiting</b><small>Copilot suggestions appear here for your review.</small></div>`;
    return;
  }
  host.innerHTML = entries.map((action) => `<article class="action-card" data-action="${escapeHtml(action.id)}"><h3>${escapeHtml(action.action.replaceAll("_", " "))}</h3><p>${escapeHtml(action.rationale)}</p><span class="risk">${escapeHtml(action.risk)}</span><div class="action-controls"><button class="approve-action" data-decision="approve">Approve in simulator</button><button class="reject-action" data-decision="reject">Reject</button></div></article>`).join("");
  host.querySelectorAll("[data-decision]").forEach((button) => button.addEventListener("click", () => reviewAction(button.closest(".action-card").dataset.action, button.dataset.decision)));
}

async function reviewAction(id, decision) {
  try {
    if (API_BASE) {
      const response = await fetch(`${API_BASE}/api/actions/${encodeURIComponent(id)}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
      if (!response.ok) throw new Error(`API returned ${response.status}.`);
    }
    const action = pending.get(id);
    if (action) action.status = decision === "approve" ? "approved-in-simulator" : "rejected";
    renderActions();
    appendActivity(`Proposal ${decision === "approve" ? "approved" : "rejected"} in simulator`, `${action?.action || "maintenance action"} · ${id}`, "action");
    showToast(decision === "approve" ? "Approved in the simulator only. No robot command was sent." : "Proposal rejected in the simulator.");
  } catch (error) { showToast(`Couldn't record the review: ${error.message}`); }
}

async function loadDashboard() {
  renderDocuments(demoDocs);
  if (!API_BASE) {
    document.querySelector("#connection-label").textContent = "DEMO MODE";
    document.querySelector("#model-label").textContent = "RETRIEVAL DEMO";
    return;
  }
  try {
    const [healthResponse, docsResponse, activityResponse] = await Promise.all([
      fetch(`${API_BASE}/api/health`), fetch(`${API_BASE}/api/documents`), fetch(`${API_BASE}/api/activity`),
    ]);
    if (!healthResponse.ok || !docsResponse.ok) throw new Error("Backend is unavailable.");
    const health = await healthResponse.json();
    const docs = await docsResponse.json();
    const activity = activityResponse.ok ? await activityResponse.json() : { activity: [] };
    document.querySelector("#connection-label").textContent = health.mode === "gemini" ? "AI CONNECTED" : "API ONLINE";
    document.querySelector("#model-label").textContent = health.mode === "gemini" ? health.model.toUpperCase() : "RETRIEVAL ONLY";
    document.querySelector("#index-label").textContent = `${health.documents} procedures indexed`;
    renderDocuments(docs.documents);
    document.querySelector("#activity-list").innerHTML = "";
    for (const entry of activity.activity.slice(0, 4).reverse()) appendActivity(entry.title, entry.detail, entry.kind, false);
  } catch {
    document.querySelector("#connection-label").textContent = "DEMO MODE";
    document.querySelector("#model-label").textContent = "RETRIEVAL DEMO";
    showToast("Backend not detected. Showing the browser-only sample demo.");
  }
}

function renderDocuments(docs) {
  const host = document.querySelector("#documents-list");
  if (!docs?.length) {
    host.innerHTML = `<div class="empty-action"><b>No source documents</b><small>Add a manual or SOP to ground answers.</small></div>`;
    return;
  }
  host.innerHTML = docs.slice(0, 6).map((doc) => `<div class="doc-row"><span class="doc-icon">${escapeHtml(doc.type || "DOC")}</span><span><b title="${escapeHtml(doc.title)}">${escapeHtml(doc.title)}</b><small>${escapeHtml(doc.source)}</small></span><span class="doc-score">●</span></div>`).join("");
  document.querySelector("#document-count").textContent = `${docs.length} docs`;
}

function appendActivity(title, detail, kind = "agent", scroll = true) {
  const host = document.querySelector("#activity-list");
  const entry = document.createElement("div");
  entry.className = "activity-entry";
  const markClass = kind === "robot" ? "blue-mark" : "mint-mark";
  entry.innerHTML = `<span class="activity-mark ${markClass}">${kind === "robot" ? "⌁" : kind === "action" ? "!" : "✓"}</span><div><b>${escapeHtml(title)}</b><p>${escapeHtml(detail)}</p></div><time>Now</time>`;
  host.prepend(entry);
  while (host.children.length > 8) host.lastElementChild.remove();
  if (scroll) document.querySelector("#activity").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

document.querySelector("#upload-trigger").addEventListener("click", () => document.querySelector("#document-upload").click());
document.querySelector("#document-upload").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (API_BASE) {
    const form = new FormData(); form.append("file", file);
    try {
      const response = await fetch(`${API_BASE}/api/documents`, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `API returned ${response.status}.`);
      const docs = await fetch(`${API_BASE}/api/documents`).then((res) => res.json());
      renderDocuments(docs.documents);
      document.querySelector("#index-label").textContent = `${data.documents} procedures indexed`;
      appendActivity("Document indexed", file.name, "knowledge");
      showToast(`${file.name} added to the local RAG index.`);
    } catch (error) { showToast(`Upload failed: ${error.message}`); }
  } else if (["text/plain", "text/markdown"].includes(file.type) || /\.(md|txt)$/i.test(file.name)) {
    const text = await file.text();
    if (text.trim().length < 40) { showToast("That file doesn't contain enough text to search."); return; }
    demoDocs.unshift({ title: file.name, source: file.name, type: file.name.toLowerCase().endsWith(".md") ? "MD" : "TXT", text });
    renderDocuments(demoDocs);
    appendActivity("Browser demo document added", file.name, "knowledge");
    showToast("Document added in this browser session only.");
  } else {
    showToast("Start the backend to index PDF files. Text and Markdown can be added in browser demo mode.");
  }
  event.target.value = "";
});

document.querySelector("#refresh-status").addEventListener("click", async () => {
  if (API_BASE) {
    try {
      const response = await fetch(`${API_BASE}/api/robots/Aster-6/refresh`, { method: "POST" });
      const { robot } = await response.json();
      document.querySelector(".featured .robot-data").innerHTML = `<span>Mode <b>${escapeHtml(robot.mode)}</b></span><span>Joint temp <b>${escapeHtml(robot.joint_temp_c)}°C</b></span><span>Last cycle <b>Now</b></span>`;
    } catch { showToast("Robot status API not reachable."); return; }
  }
  appendActivity("Robot status refreshed", "Read-only simulated snapshot; no physical connection.", "robot", false);
  showToast("Simulated robot status refreshed.");
});
document.querySelector("#clear-activity").addEventListener("click", () => { document.querySelector("#activity-list").innerHTML = ""; showToast("Activity log cleared for this view."); });
document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("selected"));
  link.classList.add("selected");
}));

function updateModelLabel(mode) {
  const label = document.querySelector("#model-label");
  if (mode === "gemini-agent") label.textContent = "GEMINI + RAG";
  else if (mode === "offline") label.textContent = "API UNAVAILABLE";
  else label.textContent = API_BASE ? "RETRIEVAL ONLY" : "BROWSER DEMO";
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3000);
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

loadDashboard();
