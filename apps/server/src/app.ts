import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyWebsocket from '@fastify/websocket';
import { env } from './config/env';
import { registerRoomRoutes } from './modules/rooms/rooms.routes';
import { registerWsServer } from './websocket/ws-server';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.isDev ? 'debug' : 'info',
      transport: env.isDev
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false, // extension communicates via WebSocket
  });

  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin or server-to-server
      const allowed = env.CORS_ORIGINS.some(
        (o) => origin === o || origin.startsWith(o)
      );
      cb(null, allowed);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await app.register(fastifyWebsocket);

  // Health endpoint
  app.get('/health', async () => ({ status: 'ok', ts: Date.now() }));

  // REST routes
  registerRoomRoutes(app);

  // WebSocket
  registerWsServer(app);

  return app;
}
