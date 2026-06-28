import { useRoomStore } from '@/shared/store/room.store';
import { wsClient } from '@/shared/ws/websocket-client';
import { VoteCard } from './VoteCard';
import { computeRoomStats } from '@planning-poker/shared-types';

export function CardGrid() {
  const { room, userId, myVote, hasVotedOptimistic, setMyVote } = useRoomStore();

  if (!room || !userId) return null;

  const { currentRound, cardSet, status } = room;
  const isRevealed = status === 'revealed';
  const isVoting = status === 'voting';
  const me = room.members.find((m) => m.userId === userId);
  const isObserver = me?.role === 'observer';

  function handleSelect(value: string) {
    if (isObserver || !isVoting || isRevealed) return;

    setMyVote(value);
    wsClient.send('submit_vote', { cardValue: value });
  }

  const stats = isRevealed && currentRound ? computeRoomStats(currentRound.votes) : null;

  return (
    <div className="flex flex-col gap-3">
      {currentRound?.story && (
        <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800 font-medium">
          {currentRound.story}
        </div>
      )}

      {isObserver ? (
        <p className="text-center text-xs text-gray-400 py-2">
          Observer mode — you cannot vote
        </p>
      ) : (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${Math.min(cardSet.cards.length, 5)}, 1fr)`,
          }}
        >
          {cardSet.cards.map((card) => (
            <VoteCard
              key={card.value}
              card={card}
              selected={myVote === card.value}
              disabled={!isVoting || isRevealed}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {isRevealed && currentRound && (
        <div className="mt-1 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <h4 className="text-xs font-semibold text-gray-500 mb-2">Results</h4>
          <div className="flex flex-col gap-1.5">
            {currentRound.votes.map((vote) => (
              <div key={vote.userId} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{vote.userName}</span>
                <span className="text-sm font-bold text-indigo-600">{vote.value}</span>
              </div>
            ))}
          </div>

          {stats && stats.hasNumericVotes && (
            <div className="mt-2 pt-2 border-t border-gray-200 flex gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500">Average</p>
                <p className="text-base font-bold text-indigo-700">{stats.average}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Median</p>
                <p className="text-base font-bold text-indigo-700">{stats.median}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {!isVoting && !isRevealed && (
        <div className="py-6 text-center text-sm text-gray-400">
          Waiting for the admin to start a round…
        </div>
      )}

      {isVoting && !hasVotedOptimistic && !isObserver && (
        <p className="text-center text-xs text-gray-400">Select a card to cast your vote</p>
      )}

      {isVoting && hasVotedOptimistic && !isRevealed && (
        <p className="text-center text-xs text-emerald-600 font-medium">
          ✓ Vote submitted — waiting for others…
        </p>
      )}
    </div>
  );
}
