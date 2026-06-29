import { useRoomStore } from '@/shared/store/room.store';
import { useSessionStore } from '@/shared/store/session.store';
import { Button, Input } from '@/shared/ui';
import { wsClient } from '@/shared/ws/websocket-client';
import { BUILT_IN_CARD_SETS } from '@planning-poker/shared-types';
import { useState } from 'react';

export function AdminControls() {
  const { room, userId } = useRoomStore();
  const { getSession, currentRoomCode } = useSessionStore();

  const [story, setStory] = useState('');
  const [showCardSetPicker, setShowCardSetPicker] = useState(false);

  if (!room || !userId) return null;

  const me = room.members.find((m) => m.userId === userId);
  if (me?.role !== 'admin') return null;

  // adminToken is only needed when sending commands — don't gate the UI on it
  const adminToken = getSession(currentRoomCode ?? room.code)?.adminToken ?? '';

  const { status } = room;

  function send<T extends Record<string, unknown>>(payload: T) {
    return { ...payload, adminToken };
  }

  function handleStartRound() {
    wsClient.send('start_round', send({ story: story.trim() }));
    setStory('');
  }

  function handleReveal() {
    wsClient.send('reveal_votes', send({}));
  }

  function handleReset() {
    wsClient.send('reset_round', send({}));
  }

  function handleStoryUpdate() {
    if (!story.trim()) return;
    wsClient.send('update_story', send({ story: story.trim() }));
    setStory('');
  }

  function handleKick(targetUserId: string) {
    if (!confirm('Remove this participant?')) return;
    wsClient.send('kick_user', send({ userId: targetUserId }));
  }

  function handleCardSetChange(cardSetId: string) {
    wsClient.send('update_card_set', send({ cardSetId }));
    setShowCardSetPicker(false);
  }

  const votingMembers = room.members.filter((m) => m.role !== 'observer');
  const votedCount = votingMembers.filter((m) => m.hasVoted).length;

  return (
    <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin Controls</p>

      {/* Story input */}
      <div className="flex gap-2">
        <Input
          placeholder={status === 'voting' ? 'Update story…' : 'Story / ticket (optional)'}
          value={story}
          onChange={(e) => setStory(e.target.value)}
          className="flex-1 text-xs py-1.5"
        />
        {status === 'voting' && story && (
          <Button size="sm" variant="secondary" onClick={handleStoryUpdate}>
            Set
          </Button>
        )}
      </div>

      {/* Primary actions */}
      <div className="flex gap-2">
        {status === 'waiting' && (
          <Button size="sm" className="flex-1" onClick={handleStartRound}>
            ▶ Start Round
          </Button>
        )}

        {status === 'voting' && (
          <>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleReveal}
              title={`${votedCount}/${votingMembers.length} voted`}
            >
              👁 Reveal {votedCount}/{votingMembers.length}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleReset}>
              ↺
            </Button>
          </>
        )}

        {status === 'revealed' && (
          <>
            <Button size="sm" className="flex-1" onClick={handleStartRound}>
              ▶ New Round
            </Button>
            <Button size="sm" variant="secondary" onClick={handleReset}>
              ↺ Reset
            </Button>
          </>
        )}
      </div>

      {/* Card set switcher */}
      <div>
        <button
          onClick={() => setShowCardSetPicker((v) => !v)}
          className="text-xs text-indigo-600 hover:underline"
        >
          Card set: {room.cardSet.name} {showCardSetPicker ? '▲' : '▼'}
        </button>

        {showCardSetPicker && (
          <div className="mt-1.5 flex flex-col gap-1">
            {BUILT_IN_CARD_SETS.map((cs) => (
              <button
                key={cs.id}
                onClick={() => handleCardSetChange(cs.id)}
                className={`text-left rounded px-2 py-1 text-xs ${
                  cs.id === room.cardSet.id
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cs.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Participant management */}
      {room.members.filter((m) => m.userId !== userId).length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Kick participant:</p>
          <div className="flex flex-wrap gap-1">
            {room.members
              .filter((m) => m.userId !== userId)
              .map((m) => (
                <button
                  key={m.userId}
                  onClick={() => handleKick(m.userId)}
                  className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50"
                >
                  {m.userName} ✕
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
