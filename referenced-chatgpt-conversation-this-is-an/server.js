import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EventBus } from "./src/event-bus.js";
import { MemoryStore } from "./src/memory.js";
import { PermissionGate } from "./src/permissions.js";
import { createRegistry } from "./src/registry.js";
import { ForgeOrchestrator } from "./src/orchestrator.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, "public");
const bus = new EventBus();
const memory = new MemoryStore(path.join(root, "data", "memory.json"));
const permissions = new PermissionGate(bus);
const registry = createRegistry();
const forge = new ForgeOrchestrator({ bus, memory, permissions, registry });

const json = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
};

const readBody = (req) => new Promise((resolve, reject) => {
  let text = "";
  req.on("data", (chunk) => {
    text += chunk;
    if (text.length > 64_000) reject(new Error("Payload too large"));
  });
  req.on("end", () => {
    try {
      resolve(JSON.parse(text || "{}"));
    } catch {
      reject(new Error("Invalid JSON"));
    }
  });
});

const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { status: "online", mode: forge.mode, modules: registry.list(), hive: registry.hive().totalAgents });
    }

    if (req.method === "GET" && url.pathname === "/api/state") return json(res, 200, forge.state());
    if (req.method === "GET" && url.pathname === "/api/events") return json(res, 200, bus.history());
    if (req.method === "GET" && url.pathname === "/api/diagnostics") return json(res, 200, forge.diagnostics());

    if (req.method === "POST" && url.pathname === "/api/chat") {
      const { message } = await readBody(req);
      return json(res, 200, await forge.respond(String(message || "")));
    }

    if (req.method === "POST" && url.pathname === "/api/permission") {
      const { id, approved } = await readBody(req);
      return json(res, 200, permissions.resolve(id, Boolean(approved)));
    }

    if (req.method === "POST" && url.pathname === "/api/module") {
      const { id, enabled } = await readBody(req);
      return json(res, 200, registry.setEnabled(id, Boolean(enabled)));
    }

    if (req.method === "POST" && url.pathname === "/api/runtime") {
      const settings = await readBody(req);
      return json(res, 200, forge.configure(settings));
    }

    const safePath = path.normalize(url.pathname === "/" ? "/index.html" : url.pathname).replace(/^([.][.][\\/])+/, "");
    const target = path.join(publicDir, safePath);
    if (!target.startsWith(publicDir)) return json(res, 403, { error: "Forbidden" });
    const info = await stat(target);
    if (!info.isFile()) throw new Error("Not a file");

    res.writeHead(200, {
      "Content-Type": `${mime[path.extname(target)] || "application/octet-stream"}; charset=utf-8`,
      "Cache-Control": path.extname(target) === ".html" ? "no-cache" : "public, max-age=3600"
    });
    res.end(await readFile(target));
  } catch (error) {
    if (error.message === "Invalid JSON" || error.message === "Payload too large") return json(res, 400, { error: error.message });
    json(res, 404, { error: "Not found" });
  }
});

const port = Number(process.env.PORT || 4173);
await memory.load();
server.listen(port, () => console.log(`Forge is listening at http://localhost:${port}`));
