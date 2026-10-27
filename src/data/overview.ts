import type { Filters } from '../app/router';
import { averageLevel, changeSince, type Change } from './metrics';
import { REFERENCE } from './reference';
import type { Rating } from './types';

export type SkillRow = { rank: number; skill: string; category: string; average: number; ratings: number };
export type CategoryRow = { category: string; current: number | null; previous: number | null; change: Change };
export type Overview = {
  people: number;
  teams: number;
  skills: number;
  categories: number;
  average: number | null;
  averageChange: Change;
  peopleDelta: number | null; // null when the previous quarter is not loaded
  teamsDelta: number | null;
  topSkills: SkillRow[];
  bottomSkills: SkillRow[];
  categoryRows: CategoryRow[];
};

// OR within a key, AND across keys; an absent or empty key keeps everything
export function matchesFilters(rating: Rating, filters: Filters): boolean {
  return (['team', 'role', 'category'] as const).every((k) => !filters[k]?.length || filters[k].includes(rating[k]));
}

function group(ratings: readonly Rating[], key: 'skill' | 'category'): Map<string, Rating[]> {
  const out = new Map<string, Rating[]>();
  for (const r of ratings) {
    const list = out.get(r[key]);
    if (list) list.push(r);
    else out.set(r[key], [r]);
  }
  return out;
}

const count = (ratings: readonly Rating[], key: 'employeeId' | 'team') => new Set(ratings.map((r) => r[key])).size;

export function overviewFor(current: readonly Rating[], previous: readonly Rating[] | undefined, filters: Filters): Overview {
  const now = current.filter((r) => matchesFilters(r, filters));
  const before = previous?.filter((r) => matchesFilters(r, filters));

  // unrated skills have no row, so they are left out rather than counted as zero
  const skills = [...group(now, 'skill')].map(([skill, rs]) => ({ skill, category: rs[0].category, average: averageLevel(rs)!, ratings: rs.length }));
  const byName = (a: { skill: string }, b: { skill: string }) => a.skill.localeCompare(b.skill);
  const ranked = (sorted: typeof skills) => sorted.slice(0, 10).map((s, i) => ({ rank: i + 1, ...s }));

  const nowByCategory = group(now, 'category');
  const beforeByCategory = before ? group(before, 'category') : new Map<string, Rating[]>();
  const categoryRows = [...REFERENCE.categories]
    .filter((c) => nowByCategory.has(c) || beforeByCategory.has(c))
    .map((category) => {
      const cur = nowByCategory.get(category) ?? [];
      const prev = beforeByCategory.get(category);
      return { category, current: averageLevel(cur), previous: prev ? averageLevel(prev) : null, change: changeSince(cur, before && (prev ?? [])) };
    });

  const people = count(now, 'employeeId');
  const teams = count(now, 'team');
  return {
    people,
    teams,
    skills: skills.length,
    categories: nowByCategory.size,
    average: averageLevel(now),
    averageChange: changeSince(now, before),
    peopleDelta: before ? people - count(before, 'employeeId') : null,
    teamsDelta: before ? teams - count(before, 'team') : null,
    topSkills: ranked([...skills].sort((a, b) => b.average - a.average || byName(a, b))),
    bottomSkills: ranked([...skills].sort((a, b) => a.average - b.average || byName(a, b))),
    categoryRows,
  };
}
