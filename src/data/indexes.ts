import type { Rating } from './types';

export type QuarterIndex = {
  byTeam: Map<string, Rating[]>;
  bySkill: Map<string, Rating[]>;
  byPerson: Map<string, Rating[]>; // by employee ID
};

const add = (map: Map<string, Rating[]>, key: string, rating: Rating) => {
  const list = map.get(key);
  if (list) list.push(rating);
  else map.set(key, [rating]);
};

// Built once per quarter when it is loaded (REQ-11), so screens never scan every rating.
export function indexQuarter(ratings: Rating[]): QuarterIndex {
  const index: QuarterIndex = { byTeam: new Map(), bySkill: new Map(), byPerson: new Map() };
  for (const r of ratings) {
    add(index.byTeam, r.team, r);
    add(index.bySkill, r.skill, r);
    add(index.byPerson, r.employeeId, r);
  }
  return index;
}
