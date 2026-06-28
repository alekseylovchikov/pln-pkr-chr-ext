import { clsx } from 'clsx';
import type { WsStatus } from '../../ws/websocket-client';

interface StatusBadgeProps {
  status: WsStatus;
}

const labels: Record<WsStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
  disconnected: 'Offline',
};

const colors: Record<WsStatus, string> = {
  connected: 'bg-emerald-500',
  connecting: 'bg-yellow-500 animate-pulse',
  reconnecting: 'bg-orange-500 animate-pulse',
  disconnected: 'bg-red-500',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
      <span className={clsx('size-2 rounded-full', colors[status])} />
      {labels[status]}
    </span>
  );
}
