export type ContextEvent = {
  kind: "context";
  gameKind: string;
  timestamp: number;
  gameTimestamp: number;
  context?: {
    location?: string;
    pois?: string[];
    date?: string;
    npcs?: string[];
  };
};
export type GameEvent =
  | {
    kind: "unknown";
    gameKind: string;
    timestamp: number;
    gameTimestamp: number;
    payload?: string;
  }
  | ContextEvent
  | {
    kind: "chat";
    gameKind: string;
    timestamp: number;
    gameTimestamp: number;
    chat: {
      name: string;
      message: string;
      background: boolean;
    };
  }
  | {
    kind: "book";
    gameKind: string;
    timestamp: number;
    gameTimestamp: number;
    title: string;
  }
  | {
    kind: "sleep";
    gameKind: string;
    timestamp: number;
    gameTimestamp: number;
    asleep: boolean;
  };

export type GameAction = {
  kind: "chat";
  chat: {
    name: string;
    message: string;
    audio?: Uint8Array;
  };
};

class GameEvents extends EventTarget {
  protected readonly events: GameEvent[] = [];
  protected actions: GameAction[] = [];

  logEvent(evt: GameEvent) {
    this.events.push(evt);
    this.dispatchEvent(new CustomEvent<GameEvent>(evt.kind, { detail: evt }));
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
