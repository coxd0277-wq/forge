const state = {
  currentView: "core",
  pendingPermission: null,
  speech: null,
  clapWake: { armed: true, lastPeakAt: 0, peaks: [] },
  latestDesign: null,
  latestLesson: null
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
  blenderStatus.textContent = payload.blender.connected ? "Linked" : "Standby";
  lessonCount.textContent = `${payload.lessons.length} saved`;
  lessonMeter.style.width = `${Math.min(100, 4 + payload.lessons.length * 9)}%`;

  renderModules(payload.modules);
  renderHive(payload.hive);
  renderEvents(payload.events);
};

const refresh = async () => {
  const res = await fetch("/api/state");
  applyState(await res.json());
};

const renderDesignToTranscript = (design) => {
  if (!design) return;
  state.latestDesign = design;
  setTranscript(
    `${design.prompt}\n1. ${design.phases[0]}\n2. ${design.phases[1]}\n3. ${design.phases[2]}\nTutorial: ${design.tutorial[0]}`,
    "FORGE // BLENDER"
  );
};

const renderLessonToTranscript = (lesson) => {
  if (!lesson) return;
  state.latestLesson = lesson;
  setTranscript(
    `${lesson.title}\nOverview: ${lesson.overview}\nConcepts: ${lesson.concepts.join(" | ")}\nPractice: ${lesson.steps[2]}\nQuiz: ${lesson.quiz[0]}`,
    "FORGE // TUTOR"
  );
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
  if (data.design) renderDesignToTranscript(data.design);
  if (data.lesson) renderLessonToTranscript(data.lesson);
  if (data.permission?.id) {
    state.pendingPermission = data.permission.id;
    approvalText.textContent = data.permission.reason;
    approval.showModal();
  }
  await refresh();
};

const postJson = (url, body) => fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
}).then((res) => res.json());

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
  await postJson("/api/module", { id, enabled });
  await refresh();
});

byId("projectorToggle").addEventListener("click", async () => {
  await postJson("/api/runtime", { projector: true, scene: "projector" });
  setTranscript("Projector scene armed. Visual focus mode is ready.", "FORGE // PROJECTOR");
  await refresh();
});

approval.querySelector("#allow").addEventListener("click", async () => {
  if (!state.pendingPermission) return approval.close();
  await postJson("/api/permission", { id: state.pendingPermission, approved: true });
  state.pendingPermission = null;
  approval.close();
  setTranscript("Approval recorded. The prepared capability is now unlocked for the next step.", "SYSTEM");
  await refresh();
});

approval.querySelector("#deny").addEventListener("click", async () => {
  if (state.pendingPermission) {
    await postJson("/api/permission", { id: state.pendingPermission, approved: false });
  }
  state.pendingPermission = null;
  approval.close();
  setTranscript("Approval denied. Forge will keep that action locked.", "SYSTEM");
  await refresh();
});

document.addEventListener("click", async (event) => {
  const quick = event.target.closest(".quick-actions button");
  if (quick?.dataset.command) {
    await sendCommand(quick.dataset.command);
    return;
  }

  const action = event.target.closest("[data-action]");
  if (!action) return;

  if (action.dataset.action === "connect-blender") {
    const result = await postJson("/api/blender/connect", {
      executable: "C:/Program Files/Blender Foundation/Blender 4.2/blender.exe",
      tutorialMode: true
    });
    setTranscript(`Blender bridge ${result.connected ? "connected" : "not connected"}.`, "FORGE // BLENDER");
    await refresh();
  }

  if (action.dataset.action === "plan-chair") {
    const design = await postJson("/api/blender/design", { prompt: "Design a modern wooden chair in Blender" });
    renderDesignToTranscript(design);
    await refresh();
  }

  if (action.dataset.action === "lesson-blender") {
    const lesson = await postJson("/api/lesson", { topic: "Blender topology for beginners" });
    renderLessonToTranscript(lesson);
    await refresh();
  }

  if (action.dataset.action === "research-to-lesson") {
    await sendCommand("Research the basics of hard-surface modeling and turn it into a mini tutorial.");
  }
});

document.querySelectorAll(".nav").forEach((button) => {
  button.addEventListener("click", async () => {
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

    if (state.currentView === "blender") {
      moduleGrid.innerHTML = `
        <article class="module">
          <span class="tag">BRIDGE</span>
          <h3>Blender Bay</h3>
          <p>Connect Forge to a local Blender workflow, generate design plans, and prepare script-ready scene setups.</p>
          <div class="agent-list">
            <button class="action-chip" data-action="connect-blender">Connect Blender</button>
            <button class="action-chip" data-action="plan-chair">Plan chair design</button>
          </div>
        </article>
        <article class="module">
          <span class="tag">TUTOR</span>
          <h3>Learn Blender</h3>
          <p>Generate a mini tutorial, guided practice, and follow-up learning prompts.</p>
          <div class="agent-list">
            <button class="action-chip" data-action="lesson-blender">Mini tutorial</button>
            <button class="action-chip" data-action="research-to-lesson">Research + teach</button>
          </div>
        </article>
      `;
    }

    if (state.currentView === "tutor") {
      moduleGrid.innerHTML = `
        <article class="module">
          <span class="tag">LESSONS</span>
          <h3>Tutor Circle</h3>
          <p>Build fast tutorials from any topic and store recent lessons locally.</p>
          <div class="agent-list">
            <button class="action-chip" data-action="lesson-blender">Blender mini tutorial</button>
            <button class="action-chip" data-action="research-to-lesson">Research to lesson</button>
          </div>
        </article>
      `;
    }

    if (state.currentView === "core") {
      await refresh();
    }
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
