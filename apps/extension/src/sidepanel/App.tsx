import { useEffect, useState } from 'react';
import { useRoomStore } from '@/shared/store/room.store';
import { useSessionStore } from '@/shared/store/session.store';
import { useWsEvents } from '@/shared/ws/use-ws-events';
import { wsClient } from '@/shared/ws/websocket-client';
import { StatusBadge } from '@/shared/ui';
import { CreateRoom } from '@/features/room/CreateRoom';
import { JoinRoom } from '@/features/room/JoinRoom';
import { CardGrid } from '@/features/voting/CardGrid';
import { ParticipantList } from '@/features/participants/ParticipantList';
import { AdminControls } from '@/features/admin/AdminControls';
import { Button } from '@/shared/ui';

export function App() {
  const { view, room, wsStatus, error, setView, leaveRoom } = useRoomStore();
  const { currentRoomCode, getSession } = useSessionStore();
  const [pendingCode, setPendingCode] = useState<string | undefined>();

  useWsEvents();

  useEffect(() => {
    // Read intent set by popup before navigating
    chrome.storage.session.get(['openView', 'pendingRoomCode'], (result) => {
      if (result.openView === 'create-room') {
        chrome.storage.session.remove('openView');
        setView('create-room');
      } else if (result.pendingRoomCode) {
        chrome.storage.session.remove('pendingRoomCode');
        setPendingCode(result.pendingRoomCode as string);
        setView('join-room');
      } else if (currentRoomCode) {
        // Attempt to rejoin existing session
        const session = getSession(currentRoomCode);
        if (session) {
          wsClient.connect().then(() => {
            wsClient.send('join_room', {
              roomCode: session.roomCode,
              userName: 'Me',
              sessionToken: session.sessionToken,
            });
          });
        }
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleLeave() {
    wsClient.send('leave_room', {});
    wsClient.disconnect();
    leaveRoom();
  }

  function copyInviteLink() {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
  }

  if (view === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <div className="text-3xl">⚠️</div>
        <p className="text-sm text-gray-700">{error}</p>
        <Button onClick={() => { leaveRoom(); }} variant="secondary" size="sm">
          Go Home
        </Button>
      </div>
    );
  }

  if (view === 'create-room') return <CreateRoom />;
  if (view === 'join-room') return <JoinRoom prefillCode={pendingCode} />;

  if (view === 'room' && room) {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white shrink-0">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 truncate">{room.name}</h1>
            <StatusBadge status={wsStatus} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyInviteLink}
              className="text-xs font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors"
              title="Click to copy room code"
            >
              {room.code}
            </button>
            <button
              onClick={handleLeave}
              className="text-gray-400 hover:text-red-500 transition-colors text-xs px-1"
              title="Leave room"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Main scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 p-4">
            {/* Reconnecting banner */}
            {wsStatus === 'reconnecting' && (
              <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-700 flex items-center gap-2">
                <span className="animate-spin">↻</span>
                Reconnecting to server…
              </div>
            )}

            {wsStatus === 'disconnected' && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                Connection lost. Trying to reconnect…
              </div>
            )}

            {/* Admin controls — shown first so they're always visible */}
            <AdminControls />

            {/* Card voting area */}
            <CardGrid />

            {/* Participants */}
            <ParticipantList />
          </div>
        </div>
      </div>
    );
  }

  // Home view
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="px-4 py-5 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-lg">🃏</span>
          <h1 className="text-base font-bold text-gray-900">Planning Poker</h1>
        </div>
        <p className="text-xs text-gray-500">Real-time estimation for dev teams</p>
      </header>

      <div className="flex flex-col gap-3 p-4 flex-1">
        <button
          onClick={() => setView('create-room')}
          className="w-full rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 px-4 py-5 text-center hover:border-indigo-400 hover:bg-indigo-100 transition-colors group"
        >
          <div className="text-2xl mb-1">+</div>
          <p className="text-sm font-semibold text-indigo-700">Create Room</p>
          <p className="text-xs text-indigo-500 mt-0.5">Start a new planning session</p>
        </button>

        <button
          onClick={() => setView('join-room')}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-5 text-center hover:border-indigo-300 hover:shadow-sm transition-all group"
        >
          <div className="text-2xl mb-1">🔗</div>
          <p className="text-sm font-semibold text-gray-700">Join Room</p>
          <p className="text-xs text-gray-500 mt-0.5">Enter a room code to join</p>
        </button>

        <div className="mt-auto">
          <StatusBadge status={wsStatus} />
        </div>
      </div>
    </div>
  );
}
