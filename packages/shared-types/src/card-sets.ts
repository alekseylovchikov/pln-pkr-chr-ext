import type { Card, CardSet } from './models';

function c(value: string, label?: string, isSpecial = false): Card {
  return { value, label: label ?? value, isSpecial };
}

export const BUILT_IN_CARD_SETS: CardSet[] = [
  {
    id: 'fibonacci',
    name: 'Fibonacci',
    isCustom: false,
    cards: [
      c('0'), c('1'), c('2'), c('3'), c('5'), c('8'),
      c('13'), c('21'), c('34'), c('55'), c('89'),
      c('?', '?', true), c('coffee', '☕', true), c('pass', 'Pass', true),
    ],
  },
  {
    id: 'modified-fibonacci',
    name: 'Modified Fibonacci',
    isCustom: false,
    cards: [
      c('0'), c('0.5'), c('1'), c('2'), c('3'), c('5'), c('8'),
      c('13'), c('20'), c('40'), c('100'),
      c('?', '?', true), c('coffee', '☕', true), c('pass', 'Pass', true),
    ],
  },
  {
    id: 'tshirt',
    name: 'T-Shirt Sizes',
    isCustom: false,
    cards: [
      c('XS'), c('S'), c('M'), c('L'), c('XL'), c('XXL'),
      c('?', '?', true), c('coffee', '☕', true), c('pass', 'Pass', true),
    ],
  },
  {
    id: 'powers-of-2',
    name: 'Powers of 2',
    isCustom: false,
    cards: [
      c('1'), c('2'), c('4'), c('8'), c('16'), c('32'), c('64'),
      c('?', '?', true), c('coffee', '☕', true), c('pass', 'Pass', true),
    ],
  },
];

export const DEFAULT_CARD_SET_ID = 'fibonacci';

export function getBuiltInCardSet(id: string): CardSet | undefined {
  return BUILT_IN_CARD_SETS.find((s) => s.id === id);
}
