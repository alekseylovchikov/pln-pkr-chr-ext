import { useState, useEffect } from 'react';
import { Button, Input, Card } from '@/shared/ui';
import { wsClient } from '@/shared/ws/websocket-client';
import { useRoomStore } from '@/shared/store/room.store';
import { useSessionStore } from '@/shared/store/session.store';

interface JoinRoomProps {
  prefillCode?: string;
}

export function JoinRoom({ prefillCode }: JoinRoomProps) {
  const [roomCode, setRoomCode] = useState(prefillCode ?? '');
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState<'participant' | 'observer'>('participant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setView, wsStatus } = useRoomStore();
  const { getSession } = useSessionStore();

  // Auto-fill name from stored session if rejoining
  useEffect(() => {
    if (roomCode.length === 6) {
      const existing = getSession(roomCode.toUpperCase());
      if (existing) setUserName((prev) => prev || 'Me');
    }
  }, [roomCode, getSession]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!roomCode.trim() || !userName.trim()) return;

    setLoading(true);
    setError('');

    const code = roomCode.trim().toUpperCase();
    const existingSession = getSession(code);

    try {
      await wsClient.connect();
      wsClient.send('join_room', {
        roomCode: code,
        userName: userName.trim(),
        sessionToken: existingSession?.sessionToken,
        role,
      });

      // WS events will handle view transition via useWsEvents
      // Set a timeout for failed connection
      const timeout = setTimeout(() => {
        if (wsStatus !== 'connected') {
          setError('Could not connect to server. Check server URL in options.');
          setLoading(false);
        }
      }, 8000);

      const unsub = wsClient.on('error', ({ message }) => {
        clearTimeout(timeout);
        setError(message);
        setLoading(false);
        unsub();
      });

      const unsubJoined = wsClient.on('joined', () => {
        clearTimeout(timeout);
        unsubJoined();
        setLoading(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setView('home')} className="text-gray-500 hover:text-gray-700 p-1">
          ←
        </button>
        <h2 className="text-base font-semibold text-gray-900">Join Room</h2>
      </div>

      <Card>
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <Input
            label="Room code"
            placeholder="ABC123"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="uppercase tracking-widest font-mono text-center text-lg"
            required
          />

          <Input
            label="Your name"
            placeholder="Bob"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            maxLength={40}
            required
          />

          <div className="flex gap-2">
            {(['participant', 'observer'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  role === r
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {r === 'participant' ? '🗳 Participant' : '👁 Observer'}
              </button>
            ))}
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <Button type="submit" loading={loading} className="w-full mt-1">
            Join
          </Button>
        </form>
      </Card>
    </div>
  );
}
