import type { WebSocket } from 'ws';
import type { ServerMessage, ServerEventType, ServerEventMap } from '@planning-poker/shared-types';

export interface Connection {
  ws: WebSocket;
  userId: string;
  userName: string;
  roomId: string;
  sessionToken: string;
  role: 'admin' | 'participant' | 'observer';
}

class ConnectionManager {
  private connections = new Map<WebSocket, Connection>();
  private userConnections = new Map<string, WebSocket>(); // userId → ws

  add(ws: WebSocket, conn: Connection): void {
    // Close stale connection for same user if exists
    const existing = this.userConnections.get(conn.userId);
    if (existing && existing !== ws && existing.readyState === existing.OPEN) {
      existing.close(1000, 'replaced by new connection');
    }

    this.connections.set(ws, conn);
    this.userConnections.set(conn.userId, ws);
  }

  get(ws: WebSocket): Connection | undefined {
    return this.connections.get(ws);
  }

  remove(ws: WebSocket): Connection | undefined {
    const conn = this.connections.get(ws);
    if (conn) {
      this.connections.delete(ws);
      // Only remove from userConnections if this is the current ws for that user
      if (this.userConnections.get(conn.userId) === ws) {
        this.userConnections.delete(conn.userId);
      }
    }
    return conn;
  }

  getRoomConnections(roomId: string): Connection[] {
    return Array.from(this.connections.values()).filter((c) => c.roomId === roomId);
  }

  send<T extends ServerEventType>(ws: WebSocket, event: T, payload: ServerEventMap[T]): void {
    if (ws.readyState !== ws.OPEN) return;
    const msg: ServerMessage = { event, payload };
    ws.send(JSON.stringify(msg));
  }

  broadcast<T extends ServerEventType>(
    roomId: string,
    event: T,
    payload: ServerEventMap[T],
    exclude?: WebSocket
  ): void {
    for (const conn of this.getRoomConnections(roomId)) {
      if (conn.ws !== exclude) {
        this.send(conn.ws, event, payload);
      }
    }
  }

  broadcastToAll<T extends ServerEventType>(
    roomId: string,
    event: T,
    payload: ServerEventMap[T]
  ): void {
    this.broadcast(roomId, event, payload);
  }
}

export const connectionManager = new ConnectionManager();
