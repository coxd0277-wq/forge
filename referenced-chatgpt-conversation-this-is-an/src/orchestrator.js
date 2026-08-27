export class ForgeOrchestrator {
  constructor({ bus, memory, permissions, registry }) { Object.assign(this, { bus, memory, permissions, registry }); this.mode = process.env.OPENAI_API_KEY ? "agent-ready" : "demo"; this.runtime = { projector: false, voice: false, scene: "command-deck", lastCommandAt: null }; }
  state() { return { mode: this.mode, runtime: this.runtime, modules: this.registry.list(), permissions: this.permissions.list(), memory: this.memory.recent(), events: this.bus.history() }; }
  configure({ projector, voice, scene }) { if (typeof projector === "boolean") this.runtime.projector = projector; if (typeof voice === "boolean") this.runtime.voice = voice; if (["command-deck", "projector", "focus"].includes(scene)) this.runtime.scene = scene; this.bus.emit("runtime.configured", { ...this.runtime }); return this.runtime; }
  diagnostics() { return { integrity: 98.7, enabledModules: this.registry.list().filter((module) => module.enabled).length, pendingApprovals: this.permissions.list().filter((item) => item.status === "pending").length, memoryEntries: this.memory.items.length, agent: this.mode, projector: this.runtime.projector ? "presentation-ready" : "standby" }; }
  async respond(message) {
    if (!message.trim()) return { text: "The forge awaits your command.", mode: this.mode };
    await this.memory.remember(message); this.runtime.lastCommandAt = new Date().toISOString(); this.bus.emit("forge.command", { message });
    const lower = message.toLowerCase();
    if (lower.startsWith("remember ")) return { text: "Bound to runic memory. I will retain that locally on this device.", mode: this.mode };
    if (lower.startsWith("recall ")) { const matches = this.memory.search(message.slice(7)); return { text: matches.length ? `I found ${matches.length} memory ${matches.length === 1 ? "mark" : "marks"}: ${matches.slice(0, 3).map((item) => `“${item.text}”`).join(" · ")}` : "No matching memory marks were found.", mode: this.mode }; }
    const needsPermission = /open|launch|control|delete|run|repair|blender|project/.test(lower);
    if (needsPermission) {
      const capability = lower.includes("blender") ? "blender.control" : lower.includes("project") ? "projector.control" : lower.includes("repair") ? "self-repair.proposal" : "computer.control";
      const permission = this.permissions.request(capability, `Forge needs approval before it can act on: “${message}”`);
      return { text: "I have prepared the action, but I will not execute device, desktop, or self-repair work without your approval.", permission, mode: this.mode };
    }
    if (this.mode === "agent-ready") {
      try {
        const { Agent, run } = await import("@openai/agents");
        const available = this.registry.list().filter((module) => module.enabled).map((module) => module.name).join(", ");
        const agent = new Agent({ name: "Forge", instructions: `You are Forge, a concise, capable personal forge assistant. Enabled modules: ${available}. Never claim to operate a device unless an approved local tool actually did so. You may plan, explain, and offer a safe next step. Keep replies under 140 words.` });
        const result = await run(agent, message); return { text: result.finalOutput, mode: "live-agent" };
      } catch (error) { this.bus.emit("agent.fallback", { reason: error.message }); }
    }
    return { text: `The core has received: “${message}”. I can keep this in runic memory, prepare a plan, or queue an approval-gated action.`, mode: this.mode };
  }
}
