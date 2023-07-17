export type GameEvent = {
  kind: string;
  timestamp: number;
  gameTimestamp: number;
  context?: {
    location?: string;
    date?: string;
    npcs?: string[];
  };
  message: string;
  chat?: {
    name: string;
    message: string;
    background: boolean;
  };
};

export type GameAction = {
  actor: string;
  action: string;
  audio?: Uint8Array;
  input: string;
};

class GameEvents extends EventTarget {
  protected readonly events: GameEvent[] = [];
  protected actions: GameAction[] = [];

  logEvent(evt: GameEvent) {
    if (evt.kind !== "request") {
      console.log("logging", evt.kind);
      this.events.push(evt);
      this.dispatchEvent(new CustomEvent<GameEvent>(evt.kind, { detail: evt }));
    }
  }
  publishAction(evt: GameAction) {
    this.actions.push(evt);
    this.dispatchEvent(new CustomEvent<GameAction>("action", { detail: evt }));
  }
  hasPendingActions() {
    return this.actions.length > 0;
  }
  popPendingActions() {
    const events = this.actions;
    this.actions = [];
    return events;
  }

  getEventLog() {
    return structuredClone(this.events);
  }
}

export const gameEvents = new GameEvents();
