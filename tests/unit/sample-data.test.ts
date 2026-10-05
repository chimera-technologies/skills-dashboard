import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadSampleDataset, SAMPLE_FILES } from '../../src/data/sample';
import { REFERENCE } from '../../src/data/reference';
import { previousQuarter } from '../../src/data/quarter';
import { validateTargetFile } from '../../src/data/validate';
import { FIRST_NAMES, LAST_NAMES, generateSampleData } from '../../scripts/generate-sample-data.mjs';

const sampleDir = path.resolve(__dirname, '../../src/data/sample');

describe('S2 sample data', () => {
  it('S2 AC-3: sample data has 4 consecutive quarters of about 300 people, 12 teams, 40 skills and 5 categories and passes validation', () => {
    expect(REFERENCE.teams.size).toBe(12);
    expect(REFERENCE.skills.size).toBe(40);
    expect([...REFERENCE.categories]).toEqual(['Cloud', 'Data', 'Development', 'Delivery', 'Leadership']);
    for (const c of REFERENCE.categories) expect([...REFERENCE.skills.values()].filter((v) => v === c), c).toHaveLength(8);

    const data = loadSampleDataset();
    const quarters = [...data.quarters.keys()];
    expect(quarters).toEqual(['2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3']);
    for (let i = 1; i < quarters.length; i++) expect(previousQuarter(quarters[i])).toBe(quarters[i - 1]);
    for (const [q, ratings] of data.quarters) {
      expect(new Set(ratings.map((r) => r.employeeId)).size, q).toBeGreaterThanOrEqual(280);
      expect(new Set(ratings.map((r) => r.employeeId)).size, q).toBeLessThanOrEqual(320);
      expect(new Set(ratings.map((r) => r.team)).size, q).toBe(12);
      expect(new Set(ratings.map((r) => r.skill)).size, q).toBe(40);
      expect(new Set(ratings.map((r) => r.category)).size, q).toBe(5);
      expect(ratings.every((r) => r.quarter === q)).toBe(true);
    }
    const targets = validateTargetFile(SAMPLE_FILES['targets.csv']);
    expect(targets.ok).toBe(true);
    expect(new Set(data.targets.map((t) => t.team)).size).toBe(12);
    // some team/skill pairs have no target (OQ-8)
    expect(data.targets.length).toBeLessThan(12 * 40);
  });

  it('S2 EC: sample files equal the generator output', () => {
    const generated = generateSampleData();
    expect(Object.keys(generated).sort()).toEqual(Object.keys(SAMPLE_FILES).sort());
    for (const [name, text] of Object.entries(generated)) {
      expect(readFileSync(path.join(sampleDir, name), 'utf8') === text, name).toBe(true);
      expect(SAMPLE_FILES[name] === text, name).toBe(true);
    }
  });

  it('S2 EC: sample data is fictional', () => {
    const first = new Set<string>(FIRST_NAMES);
    const last = new Set<string>(LAST_NAMES);
    for (const ratings of loadSampleDataset().quarters.values()) {
      for (const r of ratings) {
        const [f, l, ...rest] = r.name.split(' ');
        expect(first.has(f) && last.has(l) && rest.length === 0, r.name).toBe(true);
      }
    }
    for (const text of Object.values(SAMPLE_FILES)) {
      expect(text).not.toContain('@');
      expect(text).not.toMatch(/\d{3}[ -]?\d{3}[ -]?\d{4}/);
    }
  });
});
