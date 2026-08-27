import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export class BlenderBridge {
  constructor(rootDir, bus) {
    this.rootDir = rootDir;
    this.bus = bus;
    this.configPath = path.join(rootDir, "data", "blender-bridge.json");
    this.state = {
      connected: false,
      executable: "",
      workspace: "",
      lastScript: "",
      lastDesign: null,
      tutorialMode: true,
      status: "standby"
    };
  }

  async load() {
    try {
      const raw = await readFile(this.configPath, "utf8");
      this.state = { ...this.state, ...JSON.parse(raw) };
    } catch {}
    return this.state;
  }

  async save() {
    await mkdir(path.dirname(this.configPath), { recursive: true });
    await writeFile(this.configPath, JSON.stringify(this.state, null, 2));
  }

  async connect(config = {}) {
    this.state = {
      ...this.state,
      connected: true,
      executable: config.executable || this.state.executable,
      workspace: config.workspace || this.state.workspace,
      tutorialMode: config.tutorialMode ?? this.state.tutorialMode,
      status: "bridge-ready"
    };
    await this.save();
    this.bus.emit("blender.connected", { status: this.state.status });
    return this.state;
  }

  async disconnect() {
    this.state.connected = false;
    this.state.status = "standby";
    await this.save();
    this.bus.emit("blender.disconnected", { status: this.state.status });
    return this.state;
  }

  planDesign(prompt) {
    const topic = String(prompt || "object study").trim();
    const lower = topic.toLowerCase();
    const isChair = /chair|stool|seat/.test(lower);
    const phases = isChair
      ? [
          "Block out the seat, backrest, and legs with primitive meshes.",
          "Set proportions using simple references and a mirror modifier where useful.",
          "Refine silhouette before adding bevels, supporting loops, and surface detail.",
          "Create materials for wood, metal, or fabric depending on the design goal.",
          "Light the model with a basic three-point setup and render turntable previews."
        ]
      : [
          "Define the object shape with simple primitives.",
          "Lock major proportions and silhouette before adding details.",
          "Use modifiers and clean topology to refine the model.",
          "Add materials and presentation lighting.",
          "Render previews and note the next iteration changes."
        ];

    const tutorial = [
      `Goal: build ${topic} in clear stages rather than detailing too early.`,
      "Start with large shapes first, because proportion mistakes are easier to fix before detail work.",
      "Use references whenever possible and compare your mesh from front, side, and perspective views.",
      "Apply modifiers only when the main form feels correct.",
      "After each phase, stop and evaluate silhouette, scale, and readability."
    ];

    const script = `# Blender starter script for: ${topic}\nimport bpy\n\n# Reset scene\nbpy.ops.object.select_all(action='SELECT')\nbpy.ops.object.delete(use_global=False)\n\n# Add base object\nbpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 1))\nobj = bpy.context.active_object\nobj.name = '${topic.replace(/'/g, "")}'.strip() or 'ForgeObject'\n`;

    const design = {
      prompt: topic,
      phases,
      tutorial,
      script,
      generatedAt: new Date().toISOString()
    };

    this.state.lastDesign = design;
    this.state.lastScript = script;
    this.bus.emit("blender.design_planned", { prompt: topic });
    return design;
  }

  status() {
    return { ...this.state };
  }
}
