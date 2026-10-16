import { describe, expect, it } from 'vitest';
import { changeText, countText, deltaText, formatLevel } from '../../src/data/format';
import { matchesFilters, overviewFor } from '../../src/data/overview';
import { previousQuarter } from '../../src/data/quarter';
import { loadSampleDataset } from '../../src/data/sample';
import type { Rating } from '../../src/data/types';

let id = 0;
const r = (skill: string, category: string, level: number, more: Partial<Rating> = {}): Rating => ({
  employeeId: `E${id++}`,
  name: 'Test Person',
  team: 'Payments',
  role: 'Engineer',
  skill,
  category,
  level,
  quarter: '2026-Q3',
  ...more,
});
const many = (n: number, skill: string, category: string, level: number) => Array.from({ length: n }, () => r(skill, category, level));

describe('S5 overview data', () => {
  it('S5 AC-2: top and bottom 10 skills are ordered by average level with ties by name', () => {
    // 12 skills: levels 1..5 with ties at 3 (three skills) and at 2
    const levels: [string, number][] = [
      ['SQL', 5], ['Go', 4], ['Rust', 3], ['Git', 3], ['AWS', 3], ['Azure', 2], ['Docker', 2],
      ['Python', 1.5], ['Java', 2.5], ['Kubernetes', 4.5], ['Terraform', 1], ['Networking', 3.5],
    ];
    const ratings = levels.flatMap(([skill, level]) =>
      Number.isInteger(level) ? [r(skill, 'Development', level)] : [r(skill, 'Development', level - 0.5), r(skill, 'Development', level + 0.5)],
    );
    const o = overviewFor(ratings, undefined, {});
    expect(o.topSkills.map((s) => [s.rank, s.skill, s.average])).toEqual([
      [1, 'SQL', 5], [2, 'Kubernetes', 4.5], [3, 'Go', 4], [4, 'Networking', 3.5], [5, 'AWS', 3], [6, 'Git', 3], [7, 'Rust', 3],
      [8, 'Java', 2.5], [9, 'Azure', 2], [10, 'Docker', 2],
    ]);
    expect(o.bottomSkills.map((s) => [s.rank, s.skill])).toEqual([
      [1, 'Terraform'], [2, 'Python'], [3, 'Azure'], [4, 'Docker'], [5, 'Java'], [6, 'AWS'], [7, 'Git'], [8, 'Rust'], [9, 'Networking'], [10, 'Go'],
    ]);
    expect(o.topSkills.find((s) => s.skill === 'Java')!.ratings).toBe(2);

    // fewer than 10: only the skills there are, the same skills may be in both lists
    const small = overviewFor([r('SQL', 'Data', 4), r('Go', 'Development', 2)], undefined, {});
    expect(small.topSkills.map((s) => s.skill)).toEqual(['SQL', 'Go']);
    expect(small.bottomSkills.map((s) => s.skill)).toEqual(['Go', 'SQL']);
    expect(overviewFor([], undefined, {}).topSkills).toEqual([]);

    // the sample data: non-increasing / non-decreasing averages, 10 each
    const sample = loadSampleDataset().quarters.get('2026-Q3')!;
    const s = overviewFor(sample, undefined, {});
    expect(s.topSkills).toHaveLength(10);
    for (let i = 1; i < 10; i++) {
      expect(s.topSkills[i].average).toBeLessThanOrEqual(s.topSkills[i - 1].average);
      expect(s.bottomSkills[i].average).toBeGreaterThanOrEqual(s.bottomSkills[i - 1].average);
    }
  });

  it('S5 AC-3: category change is up, down or unchanged with the difference, or not enough data', () => {
    const current = [
      ...many(3, 'AWS', 'Cloud', 3), // exactly 3 in both: shown
      ...many(4, 'SQL', 'Data', 2),
      ...many(3, 'Go', 'Development', 4),
      ...many(2, 'Agile delivery', 'Delivery', 5), // 2 now: not enough
    ];
    const previous = [
      ...many(3, 'AWS', 'Cloud', 2),
      ...[r('SQL', 'Data', 2), r('SQL', 'Data', 2), r('SQL', 'Data', 3)], // 2.3
      ...many(5, 'Go', 'Development', 4),
      ...many(3, 'Agile delivery', 'Delivery', 1),
      ...many(4, 'Coaching', 'Leadership', 3), // only previous: still a row
    ];
    const o = overviewFor(current, previous, {});
    expect(o.categoryRows.map((c) => [c.category, formatLevel(c.current), formatLevel(c.previous), changeText(c.change)])).toEqual([
      ['Cloud', '3.0', '2.0', '▲ Up 1.0'],
      ['Data', '2.0', '2.3', '▼ Down 0.3'],
      ['Development', '4.0', '4.0', '● Unchanged'],
      ['Delivery', '5.0', '1.0', 'Not enough data'],
      ['Leadership', '–', '3.0', 'Not enough data'],
    ]);
    // a category with ratings in neither quarter has no row; no previous quarter means no change
    expect(overviewFor(many(3, 'AWS', 'Cloud', 3), undefined, {}).categoryRows).toEqual([
      { category: 'Cloud', current: 3, previous: null, change: { kind: 'not-enough-data' } },
    ]);
    // the overall change is of the shown averages, so "Up 0.1 from 2.8" agrees with "2.9"
    const up = overviewFor([...many(9, 'AWS', 'Cloud', 3), r('AWS', 'Cloud', 2)], [...many(4, 'AWS', 'Cloud', 3), r('AWS', 'Cloud', 2)], {});
    expect(up.averageChange).toMatchObject({ kind: 'change', current: 2.9, previous: 2.8, difference: 0.1, direction: 'up' });
    expect(formatLevel(3)).toBe('3.0');
    expect(formatLevel(null)).toBe('–');
  });

  it('S5 AC-3: previous quarter is the calendar quarter, not the last loaded', () => {
    const quarters = new Map([['2026-Q3', many(3, 'AWS', 'Cloud', 2)], ['2027-Q1', many(3, 'AWS', 'Cloud', 4)]]);
    expect(previousQuarter('2027-Q1')).toBe('2026-Q4');
    const o = overviewFor(quarters.get('2027-Q1')!, quarters.get(previousQuarter('2027-Q1')), {});
    expect(o.averageChange).toEqual({ kind: 'not-enough-data' });
    expect(o.peopleDelta).toBeNull();
    expect(o.categoryRows[0].change).toEqual({ kind: 'not-enough-data' });
  });

  it('S5 AC-1: filters keep only matching ratings', () => {
    const a = r('SQL', 'Data', 4, { team: 'Payments', role: 'Engineer' });
    const b = r('SQL', 'Data', 2, { team: 'Mobile', role: 'Engineer' });
    const c = r('Go', 'Development', 3, { team: 'Payments', role: 'Tester' });
    expect(matchesFilters(a, {})).toBe(true);
    expect(matchesFilters(a, { team: [] })).toBe(true);
    expect(matchesFilters(b, { team: ['Payments', 'Mobile'] })).toBe(true); // OR within a key
    expect(matchesFilters(c, { team: ['Payments'], category: ['Data'] })).toBe(false); // AND across keys
    expect(matchesFilters(c, { role: ['Tester'] })).toBe(true);

    const o = overviewFor([a, b, c], undefined, { team: ['Payments'] });
    expect([o.people, o.teams, o.skills, o.categories, o.average]).toEqual([2, 1, 2, 2, 3.5]);
    const none = overviewFor([a, b, c], undefined, { team: ['Nope'] });
    expect([none.people, none.teams, none.skills, none.categories, none.average]).toEqual([0, 0, 0, 0, null]);
    expect(none.topSkills).toEqual([]);
    expect(none.categoryRows).toEqual([]);

    // people and teams are distinct, deltas compare the filtered previous quarter
    const same = { employeeId: 'X1' };
    const twice = overviewFor([r('SQL', 'Data', 3, same), r('Go', 'Development', 3, same)], [a, b, c], {});
    expect([twice.people, twice.teams, twice.peopleDelta, twice.teamsDelta]).toEqual([1, 1, -2, -1]);
  });

  it('S5 EC-2: delta and count text for negative, zero, positive, 0, 1 and many', () => {
    expect(deltaText(4, '2026-Q2')).toBe('+4 since 2026-Q2');
    expect(deltaText(-3, '2026-Q3')).toBe('−3 since 2026-Q3');
    expect(deltaText(0, '2026-Q2')).toBe('Unchanged');
    expect(deltaText(null, '2025-Q3')).toBe('2025-Q3 not loaded');
    expect(countText(0, 'category', 'categories')).toBe('0 categories');
    expect(countText(1, 'category', 'categories')).toBe('1 category');
    expect(countText(5, 'category', 'categories')).toBe('5 categories');
    expect(changeText({ kind: 'change', current: 2, previous: 2.3, difference: -0.3, direction: 'down' })).toBe('▼ Down 0.3');
    expect(changeText({ kind: 'not-enough-data' })).toBe('Not enough data');
  });
});
