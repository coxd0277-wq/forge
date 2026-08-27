const state = {
  currentView: "core",
  pendingPermission: null,
  speech: null,
  clapWake: { armed: true, lastPeakAt: 0, peaks: [] }
};

const byId = (id) => document.getElementById(id);
const transcript = byId("transcript");
const promptInput = byId("prompt");
const modeEl = byId("mode");
const coreStatus = byId("coreStatus");
const moduleGrid = byId("moduleGrid");
const eventsEl = byId("events");
const approval = byId("approval");
const approvalText = byId("approvalText");
const memoryCount = byId("memoryCount");
const memoryMeter = byId("memoryMeter");
const gateStatus = byId("gateStatus");
const gateMeter = byId("gateMeter");
const channelCount = byId("channelCount");
const viewTitle = byId("viewTitle");
const sectionTitle = byId("sectionTitle");
const hiveGroups = byId("hiveGroups");
const agentTotal = byId("agentTotal");
const blenderStatus = byId("blenderStatus");
const autoStartStatus = byId("autoStartStatus");
const clapStatus = byId("clapStatus");
const clapMeter = byId("clapMeter");
const lessonCount = byId("lessonCount");
const lessonMeter = byId("lessonMeter");

const setTranscript = (text, label = "FORGE") => {
  transcript.innerHTML = `<span class="label">${label}</span><p>${String(text).replace(/</g, "&lt;")}</p>`;
};

const renderModules = (modules) => {
  channelCount.textContent = String(modules.length).padStart(2, "0");
  moduleGrid.innerHTML = modules.map((module) => `
    <article class="module">
      <span class="tag">${module.status.toUpperCase()}</span>
      <h3>${module.name}</h3>
      <p>${module.summary}</p>
      <div class="agent-list">
        <button data-module="${module.id}" class="action-chip">${module.enabled ? "Disable" : "Enable"}</button>
      </div>
    </article>
  `).join("");
};

const renderHive = (hive) => {
  agentTotal.textContent = `${hive.totalAgents} agents`;
  hiveGroups.innerHTML = hive.featuredGroups.map((group) => `
    <article class="group-card">
      <span class="tag">${group.agents.length} AGENTS</span>
      <h3>${group.name}</h3>
      <p>${group.description}</p>
      <div class="agent-list">
        ${group.agents.map((agent) => `<span class="agent-pill">${agent.name}</span>`).join("")}
      </div>
    </article>
  `).join("");
};

const renderEvents = (events) => {
  if (!events.length) {
    eventsEl.textContent = "Awaiting first command.";
    return;
  }
  eventsEl.innerHTML = events.slice(-8).reverse().map((event) => `
    <div class="log-entry">
      <strong>${event.type}</strong><br />
      <span>${new Date(event.at).toLocaleTimeString()}</span>
    </div>
  `).join("");
};

const applyState = (payload) => {
  modeEl.textContent = payload.mode.toUpperCase();
  coreStatus.textContent = payload.mode === "demo" ? "DEMO CORE" : "LIVE CORE";
  memoryCount.textContent = `${payload.memory.length} marks`;
  memoryMeter.style.width = `${Math.min(100, 8 + payload.memory.length * 12)}%`;

  const pending = payload.permissions.filter((item) => item.status === "pending");
  gateStatus.textContent = pending.length ? `${pending.length} PENDING` : "CLEAR";
  gateMeter.style.width = `${pending.length ? 72 : 18}%`;

  clapStatus.textContent = payload.runtime.clapWake ? "ARMED" : "DISABLED";
  clapMeter.style.width = `${payload.runtime.clapWake ? 72 : 10}%`;
  autoStartStatus.textContent = payload.runtime.autoStart ? "Enabled" : "Disabled";
  blenderStatus.textContent = payload.runtime.blenderConnected ? "Linked" : "Standby";
  lessonCount.textContent = `${payload.runtime.lessonHistory.length} queued`;
  lessonMeter.style.width = `${Math.min(100, 4 + payload.runtime.lessonHistory.length * 9)}%`;

  renderModules(payload.modules);
  renderHive(payload.hive);
  renderEvents(payload.events);
};

const refresh = async () => {
  const res = await fetch("/api/state");
  applyState(await res.json());
};

const sendCommand = async (message) => {
  setTranscript("Forging response...", "SYSTEM");
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
  const data = await res.json();
  setTranscript(data.text, data.route ? `FORGE // ${data.route.toUpperCase()}` : "FORGE");
  if (data.permission?.id) {
    state.pendingPermission = data.permission.id;
    approvalText.textContent = data.permission.reason;
    approval.showModal();
  }
  await refresh();
};

byId("commandForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = promptInput.value.trim();
  if (!message) return;
  promptInput.value = "";
  await sendCommand(message);
});

byId("moduleGrid").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-module]");
  if (!button) return;
  const id = button.getAttribute("data-module");
  const enabled = button.textContent !== "Disable";
  await fetch("/api/module", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, enabled })
  });
  await refresh();
});

byId("projectorToggle").addEventListener("click", async () => {
  await fetch("/api/runtime", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projector: true, scene: "projector" })
  });
  setTranscript("Projector scene armed. Visual focus mode is ready.", "FORGE // PROJECTOR");
  await refresh();
});

approval.querySelector("#allow").addEventListener("click", async () => {
  if (!state.pendingPermission) return approval.close();
  await fetch("/api/permission", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: state.pendingPermission, approved: true })
  });
  state.pendingPermission = null;
  approval.close();
  setTranscript("Approval recorded. The prepared capability is now unlocked for the next step.", "SYSTEM");
  await refresh();
});

approval.querySelector("#deny").addEventListener("click", async () => {
  if (state.pendingPermission) {
    await fetch("/api/permission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: state.pendingPermission, approved: false })
    });
  }
  state.pendingPermission = null;
  approval.close();
  setTranscript("Approval denied. Forge will keep that action locked.", "SYSTEM");
  await refresh();
});

document.querySelectorAll(".quick-actions button").forEach((button) => {
  button.addEventListener("click", async () => sendCommand(button.dataset.command));
});

document.querySelectorAll(".nav").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav").forEach((node) => node.classList.remove("active"));
    button.classList.add("active");
    state.currentView = button.dataset.view;
    viewTitle.textContent = ({
      core: "What shall we forge?",
      hivemind: "HiveMind specialist network",
      blender: "Blender Bay and 3D design workflows",
      tutor: "Adaptive tutorials and lessons",
      memory: "Local memory marks and recall",
      diagnostics: "Diagnostics and systems telemetry",
      permissions: "Approvals and protected actions"
    })[state.currentView] || "What shall we forge?";
    sectionTitle.innerHTML = ({
      core: 'CAPABILITY CONSTELLATION <span>toggle local foundations</span>',
      hivemind: 'HIVEMIND GROUPS <span>specialist routing and colonies</span>',
      blender: 'BLENDER TOOLING <span>design workflows and bridge status</span>',
      tutor: 'LEARNING SYSTEM <span>lessons, quizzes, and mini tutorials</span>',
      memory: 'RUNIC MEMORY <span>recent marks and local recall</span>',
      diagnostics: 'SYSTEM HEALTH <span>runtime signals and module readiness</span>',
      permissions: 'PROTECTED ACTIONS <span>approval-gated capabilities</span>'
    })[state.currentView] || 'CAPABILITY CONSTELLATION <span>toggle local foundations</span>';
  });
});

const setupSpeech = () => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return;
  const rec = new Recognition();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.onresult = async (event) => {
    const text = event.results[0][0].transcript;
    promptInput.value = text;
    await sendCommand(text);
  };
  state.speech = rec;
  byId("mic").addEventListener("click", () => rec.start());
};

const setupClapWake = async () => {
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
      const now = Date.now();
      if (avg > 45 && now - state.clapWake.lastPeakAt > 180) {
        state.clapWake.lastPeakAt = now;
        state.clapWake.peaks.push(now);
        state.clapWake.peaks = state.clapWake.peaks.filter((time) => now - time < 1100);
        if (state.clapWake.peaks.length >= 2) {
          window.focus();
          promptInput.focus();
          setTranscript("Clap wake detected. Forge is listening.", "SYSTEM");
          state.clapWake.peaks = [];
        }
      }
      requestAnimationFrame(tick);
    };

    tick();
  } catch {
    clapStatus.textContent = "BLOCKED";
    clapMeter.style.width = "18%";
  }
};

refresh();
setupSpeech();
setupClapWake();
