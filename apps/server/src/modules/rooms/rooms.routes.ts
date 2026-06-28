import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createRoom, getRoomByCode } from './rooms.service';
import { BUILT_IN_CARD_SETS } from '@planning-poker/shared-types';

interface CreateRoomBody {
  name: string;
  adminName: string;
  cardSetId?: string;
}

interface GetRoomParams {
  code: string;
}

export function registerRoomRoutes(app: FastifyInstance) {
  app.post(
    '/rooms',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'adminName'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 80 },
            adminName: { type: 'string', minLength: 1, maxLength: 40 },
            cardSetId: { type: 'string' },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Body: CreateRoomBody }>, reply: FastifyReply) => {
      const { name, adminName, cardSetId } = req.body;
      try {
        const result = await createRoom(name, adminName, cardSetId);
        return reply.status(201).send(result);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return reply.status(400).send({ error: msg });
      }
    }
  );

  app.get(
    '/rooms/:code',
    async (req: FastifyRequest<{ Params: GetRoomParams }>, reply: FastifyReply) => {
      const room = await getRoomByCode(req.params.code);
      if (!room) return reply.status(404).send({ error: 'Room not found' });
      return reply.send({ room });
    }
  );

  app.get('/card-sets', async (_req, reply) => {
    return reply.send({ cardSets: BUILT_IN_CARD_SETS });
  });
}
