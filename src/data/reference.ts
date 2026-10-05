import teams from './reference/teams.json';
import skills from './reference/skills.json';
import type { Reference } from './types';

// Set/Map lookups, so values like '__proto__' or 'constructor' are just unknown
export const REFERENCE: Reference = {
  teams: new Set(teams),
  skills: new Map(skills.map((s) => [s.skill, s.category])),
  categories: new Set(skills.map((s) => s.category)),
};
