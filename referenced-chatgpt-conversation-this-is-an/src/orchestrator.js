export class ForgeOrchestrator {
  constructor({ bus, memory, permissions, registry, blender, lessons }) {
    Object.assign(this, { bus, memory, permissions, registry, blender, lessons });
    this.mode = process.env.OPENAI_API_KEY ? "agent-ready" : "demo";
    this.runtime = {
      projector: false,
      voice: false,
      scene: "command-deck",
      clapWake: true,
      autoStart: true,
      blenderConnected: false,
      lastCommandAt: null,
      lessonHistory: []
    };
  }

  state() {
    return {
      mode: this.mode,
      runtime: this.runtime,
      modules: this.registry.list(),
      hive: this.registry.hive(),
      blender: this.blender.status(),
      lessons: this.lessons.recent(),
      permissions: this.permissions.list(),
      memory: this.memory.recent(),
      events: this.bus.history()
    };
  }

  configure({ projector, voice, scene, clapWake, autoStart, blenderConnected }) {
    if (typeof projector === "boolean") this.runtime.projector = projector;
    if (typeof voice === "boolean") this.runtime.voice = voice;
    if (typeof clapWake === "boolean") this.runtime.clapWake = clapWake;
    if (typeof autoStart === "boolean") this.runtime.autoStart = autoStart;
    if (typeof blenderConnected === "boolean") this.runtime.blenderConnected = blenderConnected;
    if (["command-deck", "projector", "focus", "tutorial", "blender-bay", "hivemind"].includes(scene)) this.runtime.scene = scene;
    this.bus.emit("runtime.configured", { ...this.runtime });
    return this.runtime;
  }

  diagnostics() {
    const modules = this.registry.list();
    return {
      integrity: 99.2,
      enabledModules: modules.filter((module) => module.enabled).length,
      pendingApprovals: this.permissions.list().filter((item) => item.status === "pending").length,
      memoryEntries: this.memory.items.length,
      lessonEntries: this.lessons.recent().length,
      agent: this.mode,
      projector: this.runtime.projector ? "presentation-ready" : "standby",
      clapWake: this.runtime.clapWake ? "armed" : "disabled",
      blender: this.blender.status().connected ? "bridge-ready" : "not-linked",
      hiveAgents: this.registry.hive().totalAgents
    };
  }

  routeIntent(message) {
    const lower = message.toLowerCase();
    if (/blender|model|mesh|3d|chair|scene|render/.test(lower)) return "blender";
    if (/learn|teach|tutorial|lesson|quiz|study|explain/.test(lower)) return "tutor";
    if (/research|compare|find sources|look up|investigate/.test(lower)) return "research";
    if (/code|build|debug|fix|refactor|script/.test(lower)) return "coding";
    if (/plan|schedule|todo|organize|remember/.test(lower)) return "everyday";
    return "orchestration";
  }

  async respond(message) {
    if (!message.trim()) return { text: "The forge awaits your command.", mode: this.mode };

    await this.memory.remember(message);
    this.runtime.lastCommandAt = new Date().toISOString();
    this.bus.emit("forge.command", { message });

    const lower = message.toLowerCase();
    const route = this.routeIntent(message);

    if (lower.startsWith("remember ")) {
      return { text: "Bound to runic memory. I will retain that locally on this device.", mode: this.mode, route: "everyday" };
    }

    if (lower.startsWith("recall ")) {
      const matches = this.memory.search(message.slice(7));
      return {
        text: matches.length
          ? `I found ${matches.length} memory ${matches.length === 1 ? "mark" : "marks"}: ${matches.slice(0, 3).map((item) => `“${item.text}”`).join(" · ")}`
          : "No matching memory marks were found.",
        mode: this.mode,
        route: "everyday"
      };
    }

    if (route === "blender") {
      const design = this.blender.planDesign(message);
      const permission = this.permissions.request("blender.control", `Forge wants to prepare a Blender-assisted design workflow for: “${message}”`);
      return {
        text: `${this.blender.status().connected ? "Blender Forge is linked." : "Blender Forge is not linked yet."} Design plan ready for ${design.prompt}.\n1. ${design.phases[0]}\n2. ${design.phases[1]}\n3. ${design.phases[2]}\nTutorial note: ${design.tutorial[1]}`,
        permission,
        design,
        mode: this.mode,
        route,
        suggestions: ["Connect Blender", "Generate Blender script", "Teach this workflow"]
      };
    }

    if (route === "tutor") {
      const lesson = this.lessons.createLesson(message.replace(/^teach me\s*/i, "").replace(/^explain\s*/i, "").trim() || message.trim());
      await this.lessons.save();
      this.runtime.lessonHistory.unshift({ topic: lesson.topic, at: lesson.createdAt });
      this.runtime.lessonHistory = this.runtime.lessonHistory.slice(0, 12);
      return {
        text: `${lesson.title}\nOverview: ${lesson.overview}\nConcepts: ${lesson.concepts.join(" | ")}\nPractice: ${lesson.steps[2]}\nQuiz: ${lesson.quiz[0]}`,
        lesson,
        mode: this.mode,
        route,
        suggestions: ["Start guided lesson", "Make quiz", "Research this topic"]
      };
    }

    if (route === "research") {
      return {
        text: "Research Swarm can investigate this topic, compare sources, pull key ideas, and turn the results into a mini tutorial or practical brief.",
        mode: this.mode,
        route,
        suggestions: ["Run research brief", "Compare sources", "Turn findings into lesson"]
      };
    }

    const needsPermission = /open|launch|control|delete|run|repair|projector/.test(lower);
    if (needsPermission) {
      const capability = lower.includes("projector") ? "projector.control" : lower.includes("repair") ? "self-repair.proposal" : "computer.control";
      const permission = this.permissions.request(capability, `Forge needs approval before it can act on: “${message}”`);
      return {
        text: "I have prepared the action, but I will not execute device, desktop, projector, or self-repair work without your approval.",
        permission,
        mode: this.mode,
        route
      };
    }

    if (this.mode === "agent-ready") {
      try {
        const { Agent, run } = await import("@openai/agents");
        const modules = this.registry.list().filter((module) => module.enabled).map((module) => module.name).join(", ");
        const agent = new Agent({
          name: "Forge Queen",
          instructions: `You are Forge Queen, a concise HiveMind orchestrator. Active route: ${route}. Enabled modules: ${modules}. You may plan, explain, teach, summarize, and coordinate specialists. Never claim to control desktop tools unless an approved local tool did so. Keep replies under 180 words and make them feel futuristic but practical.`
        });
        const result = await run(agent, message);
        return { text: result.finalOutput, mode: "live-agent", route, hiveAgents: this.registry.hive().totalAgents };
      } catch (error) {
        this.bus.emit("agent.fallback", { reason: error.message });
      }
    }

    return {
      text: `HiveMind routed your request to ${route}. The system can now teach, plan, research, prepare Blender workflows, and coordinate specialist groups while keeping high-impact actions approval-gated.`,
      mode: this.mode,
      route,
      hiveAgents: this.registry.hive().totalAgents,
      suggestions: ["Open HiveMind", "Teach me something", "Plan a Blender design"]
    };
  }
}
