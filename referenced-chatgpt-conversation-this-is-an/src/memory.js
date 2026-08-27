import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
export class MemoryStore {
  constructor(file) { this.file = file; this.items = []; }
  async load() {
    try {
      const contents = JSON.parse(await readFile(this.file, "utf8"));
      this.items = Array.isArray(contents) ? contents.slice(0, 80) : [];
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  async remember(text, kind = "conversation") {
    this.items.unshift({ id: crypto.randomUUID(), text, kind, at: new Date().toISOString() }); this.items = this.items.slice(0, 80);
    await mkdir(path.dirname(this.file), { recursive: true }); await writeFile(this.file, JSON.stringify(this.items, null, 2));
  }
  recent() { return this.items.slice(0, 8); }
  search(query) {
    const normalized = query.trim().toLowerCase();
    return normalized ? this.items.filter((item) => item.text.toLowerCase().includes(normalized)).slice(0, 12) : this.recent();
  }
}
