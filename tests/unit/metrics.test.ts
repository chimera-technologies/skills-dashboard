import { describe, expect, it } from 'vitest';
import {
  MEETS_TARGET_SHARE,
  MIN_RATINGS_FOR_CHANGE,
  averageLevel,
  changeSince,
  selectRatings,
  teamGaps,
  teamMembers,
  teamSkillChange,
} from '../../src/data/metrics';
import { loadSampleDataset } from '../../src/data/sample';
import { REFERENCE } from '../../src/data/reference';
import type { Dataset, Rating, Target } from '../../src/data/types';

let seq = 0;
function r(level: number, o: Partial<Rating> = {}): Rating {
  seq++;
  return {
    employeeId: `E${String(seq).padStart(4, '0')}`,
    name: `Person ${seq}`,
    team: 'Data Platform',
    role: 'Engineer',
    skill: 'SQL',
    category: 'Data',
    level,
    quarter: '2026-Q3',
    ...o,
  };
}
const levels = (ls: number[], o: Partial<Rating> = {}) => ls.map((l) => r(l, o));
const t = (team: string, skill: string, targetLevel: number): Target => ({ team, skill, targetLevel });

describe('S3 metrics', () => {
  it('S3 AC-1: average is the mean to one decimal excluding unrated skills', () => {
    expect(averageLevel(levels([3, 4, 4]))).toBe(3.7);
    expect(averageLevel(levels([1, 2]))).toBe(1.5);
    expect(averageLevel(levels([1, 1, 2]))).toBe(1.3);
    // a team of 5 where only 3 rated SQL: the other 2 have rows for other skills only
    const team = [...levels([2, 3, 5]), r(1, { skill: 'Kubernetes', category: 'Cloud' }), r(1, { skill: 'Terraform', category: 'Cloud' })];
    expect(teamMembers(team, 'Data Platform').size).toBe(5);
    expect(averageLevel(selectRatings(team, { team: 'Data Platform', skill: 'SQL' }))).toBe(3.3);
    expect(averageLevel(selectRatings(team, { skill: 'Docker' }))).toBeNull();
  });

  it('S3 AC-2: change needs at least 3 ratings in both quarters and a loaded previous quarter', () => {
    expect(MIN_RATINGS_FOR_CHANGE).toBe(3);
    expect(changeSince(levels([4, 4, 4]), levels([3, 3, 3]))).toEqual({
      kind: 'change', current: 4, previous: 3, difference: 1, direction: 'up',
    });
    expect(changeSince(levels([2, 2, 3]), levels([3, 3, 3]))).toMatchObject({ kind: 'change', difference: -0.7, direction: 'down' });
    expect(changeSince(levels([3, 3, 3]), levels([3, 3, 3]))).toMatchObject({ kind: 'change', difference: 0, direction: 'unchanged' });
    expect(changeSince(levels([3, 3]), levels([3, 3, 3]))).toEqual({ kind: 'not-enough-data' });
    expect(changeSince(levels([3, 3, 3]), levels([3, 3]))).toEqual({ kind: 'not-enough-data' });
    expect(changeSince(levels([3, 3, 3]), [])).toEqual({ kind: 'not-enough-data' });
    expect(changeSince(levels([3, 3, 3]), undefined)).toEqual({ kind: 'not-enough-data' });
    const ds: Dataset = { quarters: new Map([['2026-Q3', levels([3, 3, 3])]]), targets: [] };
    expect(teamSkillChange(ds, '2026-Q3', 'Data Platform', 'SQL')).toEqual({ kind: 'not-enough-data' });
  });

  it('S3 AC-3: shortfall counts members below target and meets target is true at exactly 50%', () => {
    expect(MEETS_TARGET_SHARE).toBe(0.5);
    const targets = [t('Data Platform', 'SQL', 3)];
    const unrated = r(1, { skill: 'Kubernetes', category: 'Cloud' });
    expect(teamGaps([...levels([2, 3, 4, 1]), unrated], targets, 'Data Platform')).toEqual([
      { skill: 'SQL', targetLevel: 3, rated: 4, atOrAbove: 2, shortfall: 2, meetsTarget: true },
    ]);
    expect(teamGaps(levels([2, 3, 1]), targets, 'Data Platform')[0]).toMatchObject({
      rated: 3, atOrAbove: 1, shortfall: 2, meetsTarget: false,
    });
    expect(teamGaps(levels([3]), targets, 'Data Platform')[0]).toMatchObject({ atOrAbove: 1, shortfall: 0, meetsTarget: true });
  });

  it("S3 AC-4: a person who changed team counts in each quarter's team", () => {
    const q2 = [r(5, { employeeId: 'E0001', team: 'Data Platform', quarter: '2026-Q2' }), ...levels([1, 1], { quarter: '2026-Q2' }), ...levels([1, 1, 1], { team: 'Cloud Operations', quarter: '2026-Q2' })];
    const q3 = [r(5, { employeeId: 'E0001', team: 'Cloud Operations' }), ...levels([1, 1, 1]), ...levels([1, 1], { team: 'Cloud Operations' })];
    const ds: Dataset = {
      quarters: new Map([['2026-Q2', q2], ['2026-Q3', q3]]),
      targets: [t('Data Platform', 'SQL', 3), t('Cloud Operations', 'SQL', 3)],
    };
    expect(teamMembers(q2, 'Data Platform').has('E0001')).toBe(true);
    expect(teamMembers(q3, 'Data Platform').has('E0001')).toBe(false);
    expect(teamMembers(q2, 'Cloud Operations').has('E0001')).toBe(false);
    expect(teamMembers(q3, 'Cloud Operations').has('E0001')).toBe(true);
    expect(teamGaps(q2, ds.targets, 'Data Platform')[0]).toMatchObject({ rated: 3, atOrAbove: 1 });
    expect(teamGaps(q3, ds.targets, 'Data Platform')[0]).toMatchObject({ rated: 3, atOrAbove: 0 });
    expect(teamGaps(q2, ds.targets, 'Cloud Operations')[0]).toMatchObject({ rated: 3, atOrAbove: 0 });
    expect(teamGaps(q3, ds.targets, 'Cloud Operations')[0]).toMatchObject({ rated: 3, atOrAbove: 1 });
    // Data: Q2 (5,1,1)=2.3 -> Q3 (1,1,1)=1; Cloud: Q2 (1,1,1)=1 -> Q3 (5,1,1)=2.3
    expect(teamSkillChange(ds, '2026-Q3', 'Data Platform', 'SQL')).toMatchObject({ previous: 2.3, current: 1, direction: 'down' });
    expect(teamSkillChange(ds, '2026-Q3', 'Cloud Operations', 'SQL')).toMatchObject({ previous: 1, current: 2.3, direction: 'up' });
  });

  it('S3 EC: empty inputs give null, not-enough-data and empty gaps without throwing', () => {
    expect(averageLevel([])).toBeNull();
    expect(changeSince([], [])).toEqual({ kind: 'not-enough-data' });
    expect(teamMembers([], 'Data Platform').size).toBe(0);
    expect(teamGaps([], [], 'Data Platform')).toEqual([]);
    expect(teamGaps(levels([3, 3]), [], 'Data Platform')).toEqual([]);
    expect(teamGaps(levels([3, 3]), [t('Data Platform', 'SQL', 3)], 'Mobile')).toEqual([]);
    const ds: Dataset = { quarters: new Map(), targets: [] };
    expect(teamSkillChange(ds, '2026-Q3', 'Data Platform', 'SQL')).toEqual({ kind: 'not-enough-data' });
  });

  it('S3 EC: rounding is half up on exact tenths', () => {
    expect(averageLevel(levels([4]))).toBe(4);
    // 20 ratings summing 23: mean 1.15 -> 1.2
    expect(averageLevel(levels([...Array(17).fill(1), 2, 2, 2]))).toBe(1.2);
    expect(averageLevel(levels([1, 2, 2, 2]))).toBe(1.8);
    expect(averageLevel(levels([1, 1, 1, 2]))).toBe(1.3);
    expect(averageLevel(levels([5, 5, 5]))).toBe(5);
  });

  it('S3 EC: change uses the shown averages and has no float noise', () => {
    // prev 3.24 -> 3.2, now 3.26 -> 3.3: shown difference 0.1
    const prev = levels([...Array(19).fill(3), ...Array(6).fill(4)]); // 81/25 = 3.24
    expect(averageLevel(prev)).toBe(3.2);
    const now326 = levels([...Array(37).fill(3), ...Array(13).fill(4)]); // 163/50 = 3.26
    expect(averageLevel(now326)).toBe(3.3);
    expect(changeSince(now326, prev)).toMatchObject({ difference: 0.1, direction: 'up' });
    // 3.4 - 3.2 is exactly 0.2
    const c = changeSince(levels([3, 3, 4, 4, 3]), levels([3, 3, 3, 4, 3]));
    expect(c).toMatchObject({ current: 3.4, previous: 3.2, difference: 0.2 });
    const same = changeSince(levels([3, 3, 4]), levels([4, 3, 3]));
    expect(same.kind === 'change' && Object.is(same.difference, 0)).toBe(true);
  });

  it('S3 EC: previous quarter is the calendar quarter, not the previous loaded one', () => {
    const ds: Dataset = {
      quarters: new Map([
        ['2025-Q4', levels([1, 1, 1], { quarter: '2025-Q4' })],
        ['2026-Q2', levels([3, 3, 3], { quarter: '2026-Q2' })],
      ]),
      targets: [],
    };
    expect(teamSkillChange(ds, '2026-Q2', 'Data Platform', 'SQL')).toEqual({ kind: 'not-enough-data' });
    ds.quarters.set('2026-Q1', levels([2, 2, 2], { quarter: '2026-Q1' }));
    expect(teamSkillChange(ds, '2026-Q1', 'Data Platform', 'SQL')).toMatchObject({ previous: 1, current: 2, direction: 'up' });
    expect(teamSkillChange(ds, '2026-Q2', 'Data Platform', 'SQL')).toMatchObject({ previous: 2, current: 3 });
  });

  it('S3 EC: meets target at the boundaries', () => {
    const gap = (above: number, below: number) =>
      teamGaps([...levels(Array(above).fill(4)), ...levels(Array(below).fill(2))], [t('Data Platform', 'SQL', 3)], 'Data Platform')[0];
    expect(gap(2, 2).meetsTarget).toBe(true);
    expect(gap(1, 1).meetsTarget).toBe(true);
    expect(gap(1, 2).meetsTarget).toBe(false);
    expect(gap(2, 1).meetsTarget).toBe(true);
    expect(gap(4, 18)).toMatchObject({ rated: 22, shortfall: 18, meetsTarget: false });
    expect(gap(12, 12).meetsTarget).toBe(true);
  });

  it('S3 EC: a target nobody in the team rated does not meet target', () => {
    const ratings = levels([5, 5], { skill: 'Kubernetes', category: 'Cloud' });
    expect(teamGaps(ratings, [t('Data Platform', 'SQL', 3)], 'Data Platform')).toEqual([
      { skill: 'SQL', targetLevel: 3, rated: 0, atOrAbove: 0, shortfall: 0, meetsTarget: false },
    ]);
  });

  it("S3 EC: gaps list only the team's targeted skills", () => {
    const ratings = [...levels([3, 3]), ...levels([2], { skill: 'Kubernetes', category: 'Cloud' })];
    const targets = [t('Mobile', 'SQL', 5), t('Data Platform', 'Kubernetes', 3), t('Data Platform', 'SQL', 4)];
    const gaps = teamGaps(ratings, targets, 'Data Platform');
    expect(gaps.map((g) => [g.skill, g.targetLevel])).toEqual([['Kubernetes', 3], ['SQL', 4]]);
    expect(gaps[1]).toMatchObject({ rated: 2, shortfall: 2 });
  });

  it('S3 EC: category and overall averages are weighted by rating', () => {
    const ratings = [...levels([1, 1, 1]), r(4, { skill: 'Data modelling' }), r(5, { skill: 'Kubernetes', category: 'Cloud' })];
    // weighted: (1+1+1+4)/4 = 1.75 -> 1.8 (mean of skill averages would be 2.5)
    expect(averageLevel(selectRatings(ratings, { category: 'Data' }))).toBe(1.8);
    expect(averageLevel(selectRatings(ratings, {}))).toBe(2.4);
  });

  it('S3 EC: grouping by Map handles __proto__ and constructor names', () => {
    const ratings = [...levels([4, 4], { team: '__proto__', skill: 'constructor' }), ...levels([2], { team: '__proto__', skill: '__proto__' })];
    const targets = [t('__proto__', 'constructor', 3), t('__proto__', '__proto__', 3), t('__proto__', 'toString', 3)];
    expect(teamMembers(ratings, '__proto__').size).toBe(3);
    expect(teamGaps(ratings, targets, '__proto__').map((g) => [g.rated, g.atOrAbove])).toEqual([[2, 2], [1, 0], [0, 0]]);
    expect(averageLevel(selectRatings(ratings, { team: '__proto__', skill: 'constructor' }))).toBe(4);
  });

  it('S3 EC: metrics are pure and do not mutate inputs', () => {
    const q2 = Object.freeze(levels([2, 3, 4], { quarter: '2026-Q2' }).map((x) => Object.freeze(x)));
    const q3 = Object.freeze(levels([3, 4, 5]).map((x) => Object.freeze(x)));
    const targets = Object.freeze([Object.freeze(t('Data Platform', 'SQL', 3))]);
    const ds: Dataset = { quarters: new Map<string, Rating[]>([['2026-Q2', q2 as Rating[]], ['2026-Q3', q3 as Rating[]]]), targets: targets as Target[] };
    for (const f of [
      () => averageLevel(q3),
      () => selectRatings(q3, { skill: 'SQL' }),
      () => changeSince(q3, q2),
      () => [...teamMembers(q3, 'Data Platform')],
      () => teamGaps(q3, targets, 'Data Platform'),
      () => teamSkillChange(ds, '2026-Q3', 'Data Platform', 'SQL'),
    ]) {
      expect(f()).toEqual(f());
    }
    expect(q3.map((x) => x.level)).toEqual([3, 4, 5]);
  });

  it('S3 EC: metrics for all teams over 12,000 ratings take under 100 ms', () => {
    const skills = [...REFERENCE.skills];
    const teams = [...REFERENCE.teams];
    const build = (quarter: string) => {
      const rows: Rating[] = [];
      for (let p = 0; p < 300; p++)
        for (let s = 0; s < 40; s++)
          rows.push({ employeeId: `E${p}`, name: `P${p}`, team: teams[p % 12], role: 'Engineer', skill: skills[s][0], category: skills[s][1], level: ((p + s) % 5) + 1, quarter });
      return rows;
    };
    const targets = teams.flatMap((team) => skills.slice(0, 10).map(([skill]) => t(team, skill, 3)));
    const ds: Dataset = { quarters: new Map([['2026-Q2', build('2026-Q2')], ['2026-Q3', build('2026-Q3')]]), targets };
    const run = () => {
      const q = ds.quarters.get('2026-Q3')!;
      for (const team of teams) {
        teamGaps(q, targets, team);
        for (const tg of targets) if (tg.team === team) teamSkillChange(ds, '2026-Q3', team, tg.skill);
      }
    };
    run();
    const times = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      run();
      times.push(performance.now() - start);
    }
    expect(times.sort((a, b) => a - b)[2]).toBeLessThan(100);
  });

  it('S3 EC: metrics hold their invariants on the sample data', () => {
    const ds = loadSampleDataset();
    const quarters = [...ds.quarters.keys()];
    expect(quarters.length).toBeGreaterThan(0);
    for (const quarter of quarters) {
      const q = ds.quarters.get(quarter)!;
      for (const team of REFERENCE.teams) {
        for (const g of teamGaps(q, ds.targets, team)) {
          expect(g.atOrAbove + g.shortfall).toBe(g.rated);
          const c = teamSkillChange(ds, quarter, team, g.skill);
          if (c.kind === 'change') expect(Math.round(c.difference * 10) / 10).toBe(c.difference);
        }
      }
    }
  });
});
