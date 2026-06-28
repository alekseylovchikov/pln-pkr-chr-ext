import { useState, useEffect } from 'react';
import { Button, Input, Card } from '@/shared/ui';
import { api } from '@/shared/api/http-client';
import { wsClient } from '@/shared/ws/websocket-client';
import { useRoomStore } from '@/shared/store/room.store';
import { useSessionStore } from '@/shared/store/session.store';
import type { CardSet } from '@planning-poker/shared-types';

export function CreateRoom() {
  const [roomName, setRoomName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [cardSetId, setCardSetId] = useState('fibonacci');
  const [cardSets, setCardSets] = useState<CardSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setView } = useRoomStore();
  const { saveSession } = useSessionStore();

  useEffect(() => {
    api.getCardSets().then((r) => setCardSets(r.cardSets)).catch(() => {});
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!roomName.trim() || !adminName.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result = await api.createRoom(roomName.trim(), adminName.trim(), cardSetId);

      saveSession({
        sessionToken: result.sessionToken,
        userId: result.userId,
        adminToken: result.adminToken,
        roomCode: result.room.code,
        roomName: result.room.name,
      });

      await wsClient.connect();
      wsClient.send('join_room', {
        roomCode: result.room.code,
        userName: adminName.trim(),
        sessionToken: result.sessionToken,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setView('home')} className="text-gray-500 hover:text-gray-700 p-1">
          ←
        </button>
        <h2 className="text-base font-semibold text-gray-900">Create Room</h2>
      </div>

      <Card>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <Input
            label="Room name"
            placeholder="Sprint 42 Planning"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            maxLength={80}
            required
          />

          <Input
            label="Your name"
            placeholder="Alice"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            maxLength={40}
            required
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Card set</label>
            <select
              value={cardSetId}
              onChange={(e) => setCardSetId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {cardSets.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <Button type="submit" loading={loading} size="md" className="w-full mt-1">
            Create Room
          </Button>
        </form>
      </Card>

      <p className="text-center text-xs text-gray-500">
        You will be the admin and can share the invite code with your team.
      </p>
    </div>
  );
}
