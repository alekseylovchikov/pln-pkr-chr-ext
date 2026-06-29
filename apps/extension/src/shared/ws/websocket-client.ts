import type {
  ClientEventMap,
  ClientEventType,
  ServerEventMap,
  ServerEventType,
  ServerMessage,
} from '@planning-poker/shared-types';
import { DEFAULT_SERVER_URL, DEFAULT_WS_URL, STORAGE_KEYS } from '../config';

type EventHandler<T extends ServerEventType> = (payload: ServerEventMap[T]) => void;
type AnyEventHandler = (event: ServerEventType, payload: ServerEventMap[ServerEventType]) => void;

export type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface WsClientOptions {
  onStatusChange?: (status: WsStatus) => void;
  onMessage?: AnyEventHandler;
}

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30_000;
const MAX_RECONNECT_ATTEMPTS = 10;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private status: WsStatus = 'disconnected';
  private handlers = new Map<ServerEventType, Set<EventHandler<ServerEventType>>>();
  private globalHandlers = new Set<AnyEventHandler>();
  private reconnectAttempts = 0;
  private reconnectDelay = INITIAL_RECONNECT_DELAY;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private options: WsClientOptions = {};
  private serverUrl = DEFAULT_WS_URL;
  private intentionalClose = false;
  private openResolvers: Array<() => void> = [];
  private openRejecters: Array<(e: Error) => void> = [];

  async connect(serverUrl?: string): Promise<void> {
    if (serverUrl) this.serverUrl = serverUrl;
    else {
      const stored = await new Promise<string>((resolve) => {
        chrome.storage.sync.get([STORAGE_KEYS.serverUrl], (r) => {
          const base = r[STORAGE_KEYS.serverUrl] || DEFAULT_SERVER_URL;
          resolve(base.replace(/^http/, 'ws') + '/ws');
        });
      });
      this.serverUrl = stored;
    }

    // Already open — resolve immediately
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.intentionalClose = false;
    return new Promise<void>((resolve, reject) => {
      this.openResolvers.push(resolve);
      this.openRejecters.push(reject);
      if (this.status !== 'connecting') this.doConnect();
    });
  }

  private doConnect() {
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.serverUrl);
    } catch {
      const err = new Error('WebSocket creation failed');
      this.openRejecters.forEach((r) => r(err));
      this.openResolvers = [];
      this.openRejecters = [];
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.reconnectDelay = INITIAL_RECONNECT_DELAY;
      this.setStatus('connected');
      this.openResolvers.forEach((r) => r());
      this.openResolvers = [];
      this.openRejecters = [];
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        this.dispatch(msg.event, msg.payload);
      } catch {
        // malformed message — ignore
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (this.openRejecters.length) {
        const err = new Error('WebSocket closed before connecting');
        this.openRejecters.forEach((r) => r(err));
        this.openResolvers = [];
        this.openRejecters = [];
      }
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      } else {
        this.setStatus('disconnected');
      }
    };

    this.ws.onerror = () => {
      // onclose will be called next
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.setStatus('disconnected');
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectAttempts++;
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, MAX_RECONNECT_DELAY);

    this.reconnectTimer = setTimeout(() => {
      this.doConnect();
    }, this.reconnectDelay);
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close(1000, 'intentional');
    this.ws = null;
    this.setStatus('disconnected');
  }

  send<T extends ClientEventType>(event: T, payload: ClientEventMap[T]): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify({ event, payload }));
    return true;
  }

  on<T extends ServerEventType>(event: T, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<ServerEventType>);
    return () => this.off(event, handler);
  }

  off<T extends ServerEventType>(event: T, handler: EventHandler<T>): void {
    this.handlers.get(event)?.delete(handler as EventHandler<ServerEventType>);
  }

  onAny(handler: AnyEventHandler): () => void {
    this.globalHandlers.add(handler);
    return () => this.globalHandlers.delete(handler);
  }

  setOptions(opts: WsClientOptions) {
    this.options = opts;
  }

  getStatus(): WsStatus {
    return this.status;
  }

  private dispatch(event: ServerEventType, payload: ServerEventMap[ServerEventType]) {
    this.handlers.get(event)?.forEach((h) => h(payload));
    this.globalHandlers.forEach((h) => h(event, payload));
    this.options.onMessage?.(event, payload);
  }

  private setStatus(status: WsStatus) {
    this.status = status;
    this.options.onStatusChange?.(status);
  }
}

export const wsClient = new WebSocketClient();
