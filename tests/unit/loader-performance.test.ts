import { describe, expect, it } from 'vitest';
import { validateQuarterFile } from '../../src/data/validate';
import { REFERENCE } from '../../src/data/reference';

const skills = [...REFERENCE.skills];
const teams = [...REFERENCE.teams];

// 300 people x 40 skills = 12,000 rows
function build(bad: boolean) {
  const rows = ['employee_id,name,team,role,skill,category,level,quarter'];
  for (let p = 0; p < 300; p++) {
    for (let s = 0; s < 40; s++) {
      const [skill, category] = skills[s];
      const team = bad ? 'Nowhere' : teams[p % 12];
      rows.push(`E${p},Person ${p},${team},Engineer,${skill},${category},${bad ? 'x' : (p + s) % 5 + 1},2026-Q3`);
    }
  }
  return rows.join('\n') + '\n';
}

function medianMs(text: string) {
  validateQuarterFile(text); // warm-up
  const times = [];
  for (let i = 0; i < 5; i++) {
    const t = performance.now();
    validateQuarterFile(text);
    times.push(performance.now() - t);
  }
  return times.sort((a, b) => a - b)[2];
}

describe('S2 loader performance', () => {
  it('S2 AC-4: parsing and validating a 12,000-row file takes under 300 ms', () => {
    const text = build(false);
    const r = validateQuarterFile(text);
    expect(r.ok && r.ratings.length).toBe(12000);
    expect(medianMs(text)).toBeLessThan(300);
  });

  it('S2 EC: a 12,000-row file of bad rows is reported in under 300 ms', () => {
    const text = build(true);
    const r = validateQuarterFile(text);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.badRowCount).toBe(12000);
    expect(medianMs(text)).toBeLessThan(300);
  });
});
