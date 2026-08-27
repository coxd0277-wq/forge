const modules = [
  ["voice", "Voice conduit", "Listening and speaking interface", "ready"],
  ["memory", "Runic memory", "Local memory store", "ready"],
  ["computer", "Computer tools", "Desktop control; approval required", "simulated"],
  ["blender", "Blender forge", "Scene/design handoff", "simulated"],
  ["projector", "Projector mode", "Ceiling-friendly presentation scene", "simulated"],
  ["vision", "Vision & gestures", "Camera and gesture pipeline", "simulated"],
  ["code", "Code & repair", "Safe diagnostics and repair proposals", "simulated"]
].map(([id, name, description, status]) => ({ id, name, description, status, enabled: true, updatedAt: new Date().toISOString() }));
export const createRegistry = () => ({
  list: () => modules,
  setEnabled: (id, enabled) => { const module = modules.find((item) => item.id === id); if (!module) return { error: "Module not found" }; module.enabled = enabled; module.updatedAt = new Date().toISOString(); return module; },
  get: (id) => modules.find((item) => item.id === id)
});
