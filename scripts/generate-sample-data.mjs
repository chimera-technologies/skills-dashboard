// Deterministic fictional sample data for the prototype (REQ-3).
// Usage: node scripts/generate-sample-data.mjs  (writes src/data/sample/*.csv)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/data');
const ref = (name) => JSON.parse(readFileSync(path.join(src, 'reference', name), 'utf8'));

export const FIRST_NAMES = [
  'Amara', 'Bruno', 'Chen', 'Dana', 'Esi', 'Farid', 'Greta', 'Hiro', 'Ines', 'Jonah', 'Kavya', 'Lars',
  'Mei', 'Nadia', 'Olu', 'Priya', 'Quinn', 'Rafael', 'Sven', 'Tomás', 'Uma', 'Viktor', 'Wen', 'Yara', 'Zane',
];
export const LAST_NAMES = [
  'Okafor', 'Castell', 'Wei-Lin', 'Mirov', 'Mensah', 'Haddad', 'Lindqvist', 'Tanaka', 'Duarte', 'Reyes',
  'Nair', 'Aalto', 'Kowalczyk', 'Raman', 'Ibarra', 'Adeyemi', 'Brannigan', 'Corvo', 'Delacroix', 'Eskola',
];
const ROLES = ['Associate consultant', 'Consultant', 'Senior consultant', 'Engineer', 'Senior engineer', 'Lead engineer', 'Manager'];
const QUARTERS = ['2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3'];
const PEOPLE = 300;

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSampleData() {
  const rand = mulberry32(20261005);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const clamp = (n) => Math.min(5, Math.max(1, n));
  const teams = ref('teams.json');
  const skills = ref('skills.json');
  const difficulty = skills.map(() => Math.floor(rand() * 3) - 1); // -1..1 per skill

  const names = shuffle(FIRST_NAMES.flatMap((f) => LAST_NAMES.map((l) => `${f} ${l}`)));
  let nextId = 0;
  const newPerson = (team) => {
    const levels = new Map();
    const order = shuffle(skills.map((_, i) => i));
    const aptitude = 2 + Math.floor(rand() * 3); // 2..4
    for (const s of order.slice(0, 20 + Math.floor(rand() * 21))) {
      levels.set(s, clamp(aptitude + difficulty[s] + Math.floor(rand() * 3) - 1));
    }
    nextId++;
    return { id: `E${String(nextId).padStart(4, '0')}`, name: names[nextId - 1], team, role: pick(ROLES), levels };
  };

  let people = Array.from({ length: PEOPLE }, (_, i) => newPerson(teams[i % teams.length]));
  const files = {};
  const header = 'employee_id,name,team,role,skill,category,level,quarter';
  QUARTERS.forEach((quarter, qi) => {
    if (qi > 0) {
      people = people.filter(() => rand() >= 0.04);
      for (const p of people) {
        if (rand() < 0.03) p.team = pick(teams);
        for (const [s, level] of p.levels) {
          const r = rand();
          if (r < 0.1) p.levels.set(s, clamp(level + 1));
          else if (r < 0.14) p.levels.set(s, clamp(level - 1));
        }
      }
      while (people.length < PEOPLE) people.push(newPerson(pick(teams)));
    }
    const rows = [header];
    for (const p of people) {
      for (const [s, level] of [...p.levels].sort((a, b) => a[0] - b[0])) {
        rows.push([p.id, p.name, p.team, p.role, skills[s].skill, skills[s].category, level, quarter].join(','));
      }
    }
    files[`skills-${quarter}.csv`] = rows.join('\n') + '\n';
  });

  const targets = ['team,skill,target_level'];
  for (const team of teams) {
    const order = shuffle(skills.map((s) => s.skill));
    for (const skill of order.slice(0, 10 + Math.floor(rand() * 7))) targets.push(`${team},${skill},${2 + Math.floor(rand() * 3)}`);
  }
  files['targets.csv'] = targets.join('\n') + '\n';
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [name, text] of Object.entries(generateSampleData())) writeFileSync(path.join(src, 'sample', name), text);
}
