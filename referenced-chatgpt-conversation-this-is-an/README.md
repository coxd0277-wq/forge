# Forge

Forge is a local, browser-based foundation for a personal AI assistant with a mystical Norse-forge command deck. It uses a purple energy core, carved-metal visual language, rune accents, and a high-contrast ceiling-friendly projector concept.

## Run it

1. Install Node.js 20 or newer.
2. In this folder, run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:4173`.

Forge reads `OPENAI_API_KEY` from `.env.local`. If the Agents SDK and key are available, ordinary chat requests use the live Forge agent. If the SDK/API is unavailable, Forge automatically remains usable in safe demo mode.

## What works now

- Polished responsive Forge dashboard and command interface.
- Local command history saved to `data/memory.json` (ignored by git).
- OpenAI Agents SDK path for regular conversation.
- Event bus, diagnostics/event feed, module registry, and feature enablement state.
- Permission gate and approval dialog for computer, Blender, projector, and repair-related commands.
- Health endpoint at `/health` and state endpoints under `/api`.

## Deliberate placeholders

Voice, camera/gesture recognition, OS automation, Blender control, projector discovery/output, code execution, debugging, and self-repair are **not connected to hardware or the operating system yet**. Their modules are registered and visible, and the UI safely simulates their workflow. Connecting one requires a module adapter plus an explicit permission policy; never wire real system control directly to a model response.

## Architecture

`server.js` is the local HTTP boundary. `src/orchestrator.js` is the central Forge brain; it decides whether a request is conversational or must enter the permission system. `src/registry.js` declares pluggable capabilities, `src/event-bus.js` records diagnostics, `src/memory.js` owns persistence, and `src/permissions.js` owns approval state. The static UI in `public/` talks only to HTTP APIs, so a future redesigned UI can reuse the backend unchanged.

## Adding real adapters safely

Add an adapter under `src/adapters/`, register it in `src/registry.js`, and have the orchestrator invoke it only after `PermissionGate` reports an approved request. Recommended first integrations: browser speech recognition for voice, Blender's local Python RPC server for design tasks, and a constrained desktop bridge with an allowlist for computer controls.

## Art direction note

The referenced upload was not available as a readable file in this workspace, so this first build translates the supplied direction into original CSS: obsidian stone, wrought-metal lines, rotating runes, violet fire, and a central intelligence core. Drop a licensed art asset in `public/assets/` later if you want the uploaded image used as a subtle background layer.
