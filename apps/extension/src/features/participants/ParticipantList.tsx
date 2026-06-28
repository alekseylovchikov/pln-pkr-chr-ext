import { useRoomStore } from '@/shared/store/room.store';
import { clsx } from 'clsx';

export function ParticipantList() {
  const { room, userId } = useRoomStore();
  if (!room) return null;

  const { members, status } = room;
  const voters = members.filter((m) => m.role !== 'observer');
  const observers = members.filter((m) => m.role === 'observer');

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Participants ({voters.length})
      </p>
      <ul className="flex flex-col gap-0.5">
        {voters.map((m) => (
          <li
            key={m.userId}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-gray-50"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={clsx('size-2 rounded-full shrink-0', {
                  'bg-emerald-400': m.isConnected,
                  'bg-gray-300': !m.isConnected,
                })}
              />
              <span
                className={clsx('text-sm truncate', {
                  'font-semibold text-indigo-600': m.userId === userId,
                  'text-gray-700': m.userId !== userId,
                })}
              >
                {m.userName}
                {m.userId === userId && ' (you)'}
                {m.role === 'admin' && (
                  <span className="ml-1 text-xs text-amber-600 font-normal">Admin</span>
                )}
              </span>
            </div>

            <VoteStatus hasVoted={m.hasVoted} status={status} />
          </li>
        ))}
      </ul>

      {observers.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">
            Observers ({observers.length})
          </p>
          <ul className="flex flex-col gap-0.5">
            {observers.map((m) => (
              <li key={m.userId} className="flex items-center gap-2 px-2 py-1">
                <span
                  className={clsx('size-2 rounded-full', {
                    'bg-emerald-400': m.isConnected,
                    'bg-gray-300': !m.isConnected,
                  })}
                />
                <span className="text-sm text-gray-500">{m.userName}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function VoteStatus({
  hasVoted,
  status,
}: {
  hasVoted: boolean;
  status: string;
}) {
  if (status === 'waiting') return null;
  if (status === 'revealed') return null;

  return (
    <span
      className={clsx('text-xs font-medium', {
        'text-emerald-600': hasVoted,
        'text-gray-400': !hasVoted,
      })}
    >
      {hasVoted ? '✓' : '…'}
    </span>
  );
}
