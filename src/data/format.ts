import type { Change } from './metrics';

// one decimal always ("3.0"), en dash for no value
export const formatLevel = (n: number | null) => (n === null ? '–' : n.toFixed(1));

const ARROWS = { up: '▲ Up', down: '▼ Down' };

// arrow and word, never colour alone
export function changeText(change: Change): string {
  if (change.kind === 'not-enough-data') return 'Not enough data';
  if (change.direction === 'unchanged') return '● Unchanged';
  return `${ARROWS[change.direction]} ${Math.abs(change.difference).toFixed(1)}`;
}

// U+2212 minus, so a fall never reads "+-3"
export function deltaText(delta: number | null, prev: string): string {
  if (delta === null) return `${prev} not loaded`;
  if (delta === 0) return 'Unchanged';
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('en')} since ${prev}`;
}

export const countText = (n: number, one: string, many: string) => `${n.toLocaleString('en')} ${n === 1 ? one : many}`;
