import type { FastifyInstance } from 'fastify';
import type { SocketStream } from '@fastify/websocket';
import type { WebSocket } from 'ws';
import { connectionManager } from './connection-manager';
import { handleMessage } from './handlers/index';
import * as roomRepo from '../db/repositories/room.repository';
import * as userRepo from '../db/repositories/user.repository';

const PING_INTERVAL_MS = 30_000;
const PONG_TIMEOUT_MS = 10_000;

export function registerWsServer(app: FastifyInstance) {
  app.get('/ws', { websocket: true }, (connection: SocketStream) => {
    const socket: WebSocket = connection.socket;

    let isAlive = true;
    let pingTimer: ReturnType<typeof setInterval>;
    let pongTimer: ReturnType<typeof setTimeout>;

    function startHeartbeat() {
      pingTimer = setInterval(() => {
        if (!isAlive) {
          socket.terminate();
          return;
        }
        isAlive = false;
        socket.ping();
        pongTimer = setTimeout(() => {
          if (!isAlive) socket.terminate();
        }, PONG_TIMEOUT_MS);
      }, PING_INTERVAL_MS);
    }

    socket.on('pong', () => {
      isAlive = true;
      clearTimeout(pongTimer);
    });

    socket.on('message', async (data: Buffer) => {
      isAlive = true;
      try {
        await handleMessage(socket, data.toString());
      } catch (e) {
        app.log.error(e, 'WS message handler error');
        connectionManager.send(socket, 'error', {
          code: 'INTERNAL',
          message: 'Internal server error',
        });
      }
    });

    socket.on('close', async () => {
      clearInterval(pingTimer);
      clearTimeout(pongTimer);

      const conn = connectionManager.remove(socket);
      if (conn) {
        await roomRepo.setMemberConnected(conn.roomId, conn.userId, false);
        await userRepo.deleteSession(conn.sessionToken);
        connectionManager.broadcastToAll(conn.roomId, 'user_left', { userId: conn.userId });

        setTimeout(async () => {
          const stillConnected = connectionManager
            .getRoomConnections(conn.roomId)
            .some((c) => c.userId === conn.userId);
          if (!stillConnected) {
            const room = await roomRepo.getRoomById(conn.roomId);
            if (room) connectionManager.broadcastToAll(conn.roomId, 'room_state', { room });
          }
        }, 2000);
      }
    });

    socket.on('error', (err: Error) => {
      app.log.error(err, 'WebSocket error');
    });

    startHeartbeat();
  });
}
