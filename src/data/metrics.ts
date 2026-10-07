import { previousQuarter } from './quarter';
import type { Dataset, Rating, Target } from './types';

// requirements §5 rules, shared by every screen
export const MIN_RATINGS_FOR_CHANGE = 3;
export const MEETS_TARGET_SHARE = 0.5; // OQ-2: one threshold for every team

export type Change =
  | { kind: 'change'; current: number; previous: number; difference: number; direction: 'up' | 'down' | 'unchanged' }
  | { kind: 'not-enough-data' };

export type Gap = { skill: string; targetLevel: number; rated: number; atOrAbove: number; shortfall: number; meetsTarget: boolean };

export type RatingFilter = { team?: string; skill?: string; category?: string };

// mean in whole tenths, half up; computed from the integer sum so 1.15 rounds to 1.2
function averageTenths(ratings: readonly Rating[]): number | null {
  if (ratings.length === 0) return null;
  let sum = 0;
  for (const r of ratings) sum += r.level;
  return Math.round((sum * 10) / ratings.length);
}

// unrated skills have no row, so they never count as zero
export function averageLevel(ratings: readonly Rating[]): number | null {
  const tenths = averageTenths(ratings);
  return tenths === null ? null : tenths / 10;
}

export function selectRatings(ratings: readonly Rating[], { team, skill, category }: RatingFilter): Rating[] {
  return ratings.filter(
    (r) => (team === undefined || r.team === team) && (skill === undefined || r.skill === skill) && (category === undefined || r.category === category),
  );
}

// difference of the averages as shown (one decimal), so the text matches the numbers on screen
export function changeSince(current: readonly Rating[], previous: readonly Rating[] | undefined): Change {
  if (!previous || current.length < MIN_RATINGS_FOR_CHANGE || previous.length < MIN_RATINGS_FOR_CHANGE) return { kind: 'not-enough-data' };
  const now = averageTenths(current)!;
  const before = averageTenths(previous)!;
  const diff = now - before;
  return {
    kind: 'change',
    current: now / 10,
    previous: before / 10,
    difference: diff / 10,
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'unchanged',
  };
}

// membership comes from each quarter's own file
export function teamMembers(ratings: readonly Rating[], team: string): Set<string> {
  const ids = new Set<string>();
  for (const r of ratings) if (r.team === team) ids.add(r.employeeId);
  return ids;
}

// one Gap per target of the team, in target-file order; only members who rated the skill count
export function teamGaps(ratings: readonly Rating[], targets: readonly Target[], team: string): Gap[] {
  const bySkill = new Map<string, number[]>();
  for (const r of ratings) {
    if (r.team !== team) continue;
    const ls = bySkill.get(r.skill);
    if (ls) ls.push(r.level);
    else bySkill.set(r.skill, [r.level]);
  }
  return targets
    .filter((t) => t.team === team)
    .map(({ skill, targetLevel }) => {
      const ls = bySkill.get(skill) ?? [];
      const atOrAbove = ls.filter((l) => l >= targetLevel).length;
      return {
        skill,
        targetLevel,
        rated: ls.length,
        atOrAbove,
        shortfall: ls.length - atOrAbove,
        meetsTarget: ls.length > 0 && atOrAbove >= ls.length * MEETS_TARGET_SHARE,
      };
    });
}

// compares with the calendar quarter before, not the previous loaded one
export function teamSkillChange(dataset: Dataset, quarter: string, team: string, skill: string): Change {
  const current = dataset.quarters.get(quarter);
  if (!current) return { kind: 'not-enough-data' };
  const previous = dataset.quarters.get(previousQuarter(quarter));
  return changeSince(selectRatings(current, { team, skill }), previous && selectRatings(previous, { team, skill }));
}
