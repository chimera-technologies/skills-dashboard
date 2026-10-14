import { describe, expect, it } from 'vitest';
import { indexQuarter } from '../../src/data/indexes';
import type { Rating } from '../../src/data/types';

const rating = (employeeId: string, team: string, skill: string): Rating => ({
  employeeId, name: `N ${employeeId}`, team, role: 'Engineer', skill, category: 'Cloud', level: 3, quarter: '2026-Q3',
});

describe('S4 per-quarter indexes', () => {
  it('S4 EC: every rating appears once in each index', () => {
    const ratings = [rating('E1', 'Payments', 'SQL'), rating('E1', 'Payments', 'Go'), rating('E2', 'Mobile', 'SQL')];
    const idx = indexQuarter(ratings);
    for (const map of [idx.byTeam, idx.bySkill, idx.byPerson]) {
      expect([...map.values()].flat().sort((a, b) => ratings.indexOf(a) - ratings.indexOf(b))).toEqual(ratings);
    }
    expect(idx.byTeam.get('Payments')).toEqual(ratings.slice(0, 2));
    expect(idx.bySkill.get('SQL')).toEqual([ratings[0], ratings[2]]);
    expect(idx.byPerson.get('E2')).toEqual([ratings[2]]);
  });

  it('S4 EC: __proto__ and constructor names are ordinary keys', () => {
    const idx = indexQuarter([rating('__proto__', 'constructor', '__proto__')]);
    expect(idx.byPerson.get('__proto__')).toHaveLength(1);
    expect(idx.byTeam.get('constructor')).toHaveLength(1);
    expect(idx.bySkill.get('toString')).toBeUndefined();
  });

  it('S4 EC: an empty quarter gives empty indexes', () => {
    const idx = indexQuarter([]);
    expect([idx.byTeam.size, idx.bySkill.size, idx.byPerson.size]).toEqual([0, 0, 0]);
  });
});
