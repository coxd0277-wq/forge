import { createAgentGroups } from "./agent-groups.js";

const defaults = [
  { id: "voice", name: "Voice Channel", status: "ready", enabled: true, summary: "Browser speech recognition and spoken command intake." },
  { id: "memory", name: "Runic Memory", status: "ready", enabled: true, summary: "Local memory marks and quick semantic recall." },
  { id: "diagnostics", name: "Diagnostics", status: "ready", enabled: true, summary: "Local runtime health, event tracing, and subsystem checks." },
  { id: "projector", name: "Projector", status: "standby", enabled: true, summary: "Presentation mode, fullscreen focus scenes, and visual overlays." },
  { id: "research", name: "Research Swarm", status: "planned", enabled: true, summary: "Topic investigation, evidence gathering, and synthesis." },
  { id: "tutor", name: "Tutor Circle", status: "planned", enabled: true, summary: "Mini-lessons, learning plans, quizzes, and adaptive teaching." },
  { id: "blender", name: "Blender Forge", status: "planned", enabled: false, summary: "Blender bridge, script generation, design guidance, and modeling support." },
  { id: "automation", name: "AutoPilot", status: "planned", enabled: true, summary: "Startup workflows, recurring tasks, schedules, and safe automations." },
  { id: "hivemind", name: "HiveMind", status: "planned", enabled: true, summary: "Dynamic multi-agent routing and specialist group orchestration." }
];

export const createRegistry = () => {
  const modules = structuredClone(defaults);
  const hive = createAgentGroups();

  return {
    list() {
      return modules.map((module) => ({ ...module }));
    },
    get(id) {
      return modules.find((module) => module.id === id) || null;
    },
    setEnabled(id, enabled) {
      const module = modules.find((item) => item.id === id);
      if (!module) return { error: "Module not found" };
      module.enabled = enabled;
      module.status = enabled ? module.status === "standby" ? "ready" : module.status : "offline";
      return { ...module };
    },
    hive() {
      return hive;
    }
  };
};
