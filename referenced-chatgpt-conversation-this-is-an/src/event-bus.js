export class EventBus {
  constructor() { this.events = []; }
  emit(type, detail = {}) {
    const event = { id: crypto.randomUUID(), type, detail, at: new Date().toISOString() };
    this.events.unshift(event); this.events = this.events.slice(0, 60); return event;
  }
  history() { return this.events; }
}
