export class PermissionGate {
  constructor(bus) { this.bus = bus; this.pending = []; }
  request(capability, reason) {
    const item = { id: crypto.randomUUID(), capability, reason, status: "pending" };
    this.pending.unshift(item); this.bus.emit("permission.requested", item); return item;
  }
  resolve(id, approved) {
    const item = this.pending.find((entry) => entry.id === id); if (!item) return { error: "Permission request not found" };
    item.status = approved ? "approved" : "denied"; this.bus.emit("permission.resolved", item); return item;
  }
  list() { return this.pending; }
}
