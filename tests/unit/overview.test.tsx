import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { SAMPLE_FILES } from '../../src/data/sample';
import { validateQuarterFile } from '../../src/data/validate';
import { csvFile, pick, quarterCsv, quarterSelect, renderShell, status, stubBrowser } from './helpers/app';

beforeEach(() => {
  stubBrowser();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const SAMPLE = 'Sample data (fictional)';

// [value, sub-line] of the stat card with this label
function stat(label: string) {
  const card = [...document.querySelectorAll('.stat')].find((e) => e.querySelector('.stat-label')?.textContent === label)!;
  return [card.querySelector('.stat-value')!.textContent, card.querySelector('.stat-sub')!.textContent];
}
const table = (name: RegExp) => screen.getByRole('table', { name });
const rowsOf = (t: HTMLElement) =>
  within(t).getAllByRole('row').slice(1).map((tr) => within(tr).getAllByRole('cell').map((td) => td.textContent));
const select = (q: string) => fireEvent.change(quarterSelect(), { target: { value: q } });
const go = (hash: string) =>
  act(() => {
    history.replaceState(null, '', `/${hash}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

// expected numbers computed independently of overviewFor: a plain loop over the bundled file
function expected(quarter: string) {
  const result = validateQuarterFile(SAMPLE_FILES[`skills-${quarter}.csv`]);
  if (!result.ok) throw new Error('bad sample');
  const people = new Set<string>();
  const teams = new Set<string>();
  const skills = new Set<string>();
  let sum = 0;
  for (const r of result.ratings) {
    people.add(r.employeeId);
    teams.add(r.team);
    skills.add(r.skill);
    sum += r.level;
  }
  return { people: people.size, teams: teams.size, skills: skills.size, average: (Math.round((sum * 10) / result.ratings.length) / 10).toFixed(1) };
}

describe('S5 organisation overview', () => {
  it('S5 AC-1: headline numbers match the sample data for each selected quarter', async () => {
    renderShell('#/');
    for (const q of ['2026-Q3', '2026-Q2', '2026-Q1', '2025-Q4']) {
      select(q);
      const e = expected(q);
      expect(stat('People')[0]).toBe(String(e.people));
      expect(stat('Teams')[0]).toBe(String(e.teams));
      expect(stat('Skills assessed')).toEqual([String(e.skills), '5 categories']);
      expect(stat('Average level')[0]).toBe(e.average);
    }
    select('2026-Q3');
    const [q3, q2] = [expected('2026-Q3'), expected('2026-Q2')];
    const d = q3.people - q2.people;
    expect(stat('People')[1]).toBe(d === 0 ? 'Unchanged' : `${d > 0 ? '+' : '−'}${Math.abs(d)} since 2026-Q2`);
    expect(screen.getByText(`2026-Q3, compared with 2026-Q2 · ${SAMPLE}`)).toBeTruthy();

    // a loaded file recomputes the screen
    pick('Quarter file', csvFile('new.csv', quarterCsv('2026-Q4')));
    await waitFor(() => expect(status()).toMatch(/Loaded 2026-Q4/));
    expect([stat('People')[0], stat('Teams')[0], stat('Skills assessed')[0], stat('Average level')[0]]).toEqual(['2', '1', '1', '3.0']);
    expect(stat('Skills assessed')[1]).toBe('1 category');
  });

  it('S5 AC-2: top and bottom 10 are tables with the level as text next to each bar', () => {
    renderShell('#/');
    for (const name of [/^Top 10 skills in 2026-Q3$/, /^Bottom 10 skills in 2026-Q3$/]) {
      const t = table(name);
      const headers = within(t).getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers.map((h) => h!.replace(/ [▲▼⇅]$/, ''))).toEqual(['#', 'Skill', 'Avg level', 'Bar']);
      const rows = within(t).getAllByRole('row').slice(1);
      expect(rows).toHaveLength(10);
      for (const tr of rows) {
        const cells = within(tr).getAllByRole('cell');
        expect(cells[2].textContent).toMatch(/^\d\.\d$/);
        const bar = cells[3].querySelector<HTMLElement>('.bar-track > .bar[aria-hidden="true"]');
        expect(bar).toBeTruthy();
        // width is the average as a % of 5 (the shown level is rounded to 0.1, so within 1%)
        expect(bar!.style.width).toMatch(/%$/);
        expect(Math.abs(parseFloat(bar!.style.width) - Number(cells[2].textContent) * 20)).toBeLessThanOrEqual(1);
      }
    }
    expect(screen.getByRole('heading', { level: 3, name: 'Top 10 skills' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Bottom 10 skills' })).toBeTruthy();
  });

  it('S5 BUG-1: rendered top and bottom tables are ordered by level, ties A–Z, ranks 1..n, aria-sort matches the arrow', () => {
    renderShell('#/');
    for (const [name, dir, arrow] of [
      [/^Top 10 skills/, 'descending', '▼'],
      [/^Bottom 10 skills/, 'ascending', '▲'],
    ] as const) {
      const t = table(name);
      const rows = rowsOf(t);
      expect(rows.map((r) => r[0])).toEqual(rows.map((_, i) => String(i + 1)));
      for (let i = 1; i < rows.length; i++) {
        const [a, b] = [Number(rows[i - 1][2]), Number(rows[i][2])];
        expect(dir === 'descending' ? b <= a : b >= a).toBe(true);
        if (a === b) expect(rows[i - 1][1]!.localeCompare(rows[i][1]!)).toBeLessThan(0);
      }
      const header = within(t).getByRole('columnheader', { name: /^Avg level/ });
      expect(header.getAttribute('aria-sort')).toBe(dir);
      expect(header.textContent).toBe(`Avg level ${arrow}`);
    }
  });

  it('S5 AC-3: earliest quarter shows not enough data everywhere', () => {
    renderShell('#/');
    select('2025-Q4');
    expect(screen.getByText(`2025-Q4 · ${SAMPLE} · 2025-Q3 is not loaded, so no change is shown`)).toBeTruthy();
    expect(stat('People')[1]).toBe('2025-Q3 not loaded');
    expect(stat('Teams')[1]).toBe('2025-Q3 not loaded');
    expect(stat('Average level')[1]).toBe('Not enough data');
    const t = table(/^Average per category, 2025-Q4 against 2025-Q3$/);
    expect(within(t).getAllByRole('columnheader').map((h) => h.textContent!.replace(/ [▲▼⇅]$/, ''))).toEqual([
      'Category', '2025-Q4', '2025-Q3', 'Change',
    ]);
    const rows = rowsOf(t);
    expect(rows.map((r) => r[0])).toEqual(['Cloud', 'Data', 'Development', 'Delivery', 'Leadership']);
    for (const r of rows) expect([r[2], r[3]]).toEqual(['–', 'Not enough data']);
  });

  it('S5 AC-1: filters matching nothing show zeros and empty tables', () => {
    renderShell('#/?team=Nope');
    expect(stat('People')[0]).toBe('0');
    expect(stat('Teams')[0]).toBe('0');
    expect(stat('Skills assessed')).toEqual(['0', '0 categories']);
    expect(stat('Average level')).toEqual(['–', 'Not enough data']);
    expect(screen.getByText('No ratings match the applied filters')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Download CSV (no rows)' })).toHaveLength(3);
  });

  it('S5 EC-1: a file loaded over the sample names both sources in the subtitle', async () => {
    renderShell('#/');
    pick('Quarter file', csvFile('mine.csv', quarterCsv('2026-Q3', 3)));
    await waitFor(() => expect(status()).toMatch(/Replaced 2026-Q3/));
    expect(screen.getByText(`2026-Q3 (mine.csv), compared with 2026-Q2 (${SAMPLE})`)).toBeTruthy();
    expect(screen.getByText('The two quarters come from different sources; changes compare them as loaded')).toBeTruthy();
    select('2026-Q2');
    expect(screen.getByText(`2026-Q2, compared with 2026-Q1 · ${SAMPLE}`)).toBeTruthy();
    expect(screen.queryByText(/come from different sources/)).toBeNull();
  });

  it('S5 EC-2: sub-lines for fewer people, a category link and filters matching nothing', async () => {
    renderShell('#/');
    pick('Quarter file', csvFile('mine.csv', quarterCsv('2026-Q3', 3)));
    await waitFor(() => expect(status()).toMatch(/Replaced 2026-Q3/));
    const q2 = expected('2026-Q2');
    expect(stat('People')).toEqual(['3', `−${q2.people - 3} since 2026-Q2`]);
    expect(stat('Teams')).toEqual(['1', `−${q2.teams - 1} since 2026-Q2`]);
    expect(stat('Skills assessed')).toEqual(['1', '1 category']);

    select('2026-Q2');
    const link = within(table(/^Average per category/)).getByRole('link', { name: 'Data' });
    expect(link.getAttribute('href')).toBe('#/?category=Data');
    expect(link.className).toBe('row-link'); // styled as a row label, not an accent link
    go('#/?category=Data');
    expect(stat('Skills assessed')[1]).toBe('1 category');
    expect(rowsOf(table(/^Average per category/)).map((r) => r[0])).toEqual(['Data']);
    expect(screen.getByRole('region', { name: 'Applied filters' }).textContent).toContain('Category: Data');
    go('#/?category=Data&team=Nope');
    expect(stat('Skills assessed')[1]).toBe('0 categories');
  });

  it('S5 EC-3: sort on the current-quarter column survives a quarter switch', () => {
    renderShell('#/');
    fireEvent.click(within(table(/^Average per category/)).getByRole('button', { name: /^2026-Q3/ }));
    select('2026-Q2');
    const t = table(/^Average per category, 2026-Q2 against 2026-Q1$/);
    expect(within(t).getByRole('columnheader', { name: /^2026-Q2/ }).getAttribute('aria-sort')).toBe('ascending');
    const current = rowsOf(t).map((r) => Number(r[1]));
    expect(current).toEqual([...current].sort((a, b) => a - b));
  });
});
