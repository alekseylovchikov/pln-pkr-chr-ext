import { clsx } from 'clsx';
import type { Card } from '@planning-poker/shared-types';

interface VoteCardProps {
  card: Card;
  selected: boolean;
  disabled: boolean;
  onSelect: (value: string) => void;
}

export function VoteCard({ card, selected, disabled, onSelect }: VoteCardProps) {
  const isSpecial = card.isSpecial;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(card.value)}
      className={clsx(
        'relative flex items-center justify-center rounded-xl border-2 font-bold transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1',
        'h-16 select-none text-sm',
        isSpecial ? 'text-base' : '',
        {
          'border-indigo-500 bg-indigo-500 text-white shadow-md scale-105': selected && !disabled,
          'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:scale-105 active:scale-95 cursor-pointer':
            !selected && !disabled,
          'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60':
            disabled,
        }
      )}
    >
      {card.label}
    </button>
  );
}
