import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export class LessonEngine {
  constructor(rootDir, bus) {
    this.rootDir = rootDir;
    this.bus = bus;
    this.file = path.join(rootDir, "data", "lessons.json");
    this.lessons = [];
  }

  async load() {
    try {
      this.lessons = JSON.parse(await readFile(this.file, "utf8"));
    } catch {
      this.lessons = [];
    }
    return this.lessons;
  }

  async save() {
    await mkdir(path.dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify(this.lessons, null, 2));
  }

  createLesson(topic) {
    const clean = String(topic || "general topic").trim();
    const lesson = {
      id: `lesson-${Date.now()}`,
      topic: clean,
      title: `Mini tutorial: ${clean}`,
      overview: `This lesson gives you a fast practical introduction to ${clean}.`,
      concepts: [
        `What ${clean} is`,
        `Why ${clean} matters`,
        `Key beginner ideas in ${clean}`
      ],
      steps: [
        `Read a simple explanation of ${clean}.`,
        `Study one worked example.`,
        `Try one small practice task.`,
        `Check mistakes and refine your understanding.`
      ],
      quiz: [
        `In your own words, what is ${clean}?`,
        `What is one common mistake beginners make in ${clean}?`,
        `What would you practice next to improve at ${clean}?`
      ],
      createdAt: new Date().toISOString()
    };
    this.lessons.unshift(lesson);
    this.lessons = this.lessons.slice(0, 50);
    this.bus.emit("lesson.created", { topic: clean });
    return lesson;
  }

  recent() {
    return this.lessons.slice(0, 10);
  }
}
