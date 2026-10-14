import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MAX_FILE_BYTES } from '../../src/app/LoadFile';
import {
  HEADER, csvFile, loadButtons, optionTexts, pick, quarterCsv, quarterSelect, renderShell, status, stubBrowser, targetCsv,
} from './helpers/app';

const sample = vi.hoisted(() => ({ fail: false }));
vi.mock('../../src/data/sample', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/data/sample')>();
  return {
    ...real,
    loadSampleDataset: () => {
      if (sample.fail) throw new Error('Sample file broken');
      return real.loadSampleDataset();
    },
  };
});

beforeEach(() => {
  sample.fail = false;
  stubBrowser();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const SAMPLE_OPTIONS = ['2026-Q3 (latest)', '2026-Q2', '2026-Q1', '2025-Q4'];

describe('S4 app shell', () => {
  it('S4 AC-1: quarter selector defaults to the latest loaded quarter', async () => {
    renderShell();
    expect(quarterSelect().value).toBe('2026-Q3');
    expect(optionTexts()).toEqual(SAMPLE_OPTIONS);

    pick('Quarter file', csvFile('old.csv', quarterCsv('2025-Q3')));
    await waitFor(() => expect(status()).toMatch(/Loaded 2025-Q3/));
    expect(quarterSelect().value).toBe('2025-Q3');
    expect(optionTexts()).toEqual([...SAMPLE_OPTIONS, '2025-Q3']);

    pick('Quarter file', csvFile('new.csv', quarterCsv('2026-Q4')));
    await waitFor(() => expect(status()).toMatch(/Loaded 2026-Q4/));
    expect(quarterSelect().value).toBe('2026-Q4');
    expect(optionTexts()[0]).toBe('2026-Q4 (latest)');
    expect(optionTexts()).toContain('2026-Q3');

    fireEvent.change(quarterSelect(), { target: { value: '2026-Q1' } });
    expect(quarterSelect().value).toBe('2026-Q1');
    expect(screen.getByRole('heading', { level: 2, name: 'Organisation overview' })).toBeTruthy();
    expect(screen.getByText(/2026-Q1/, { selector: 'main p' })).toBeTruthy();
  });

  it('S4 EC: an empty dataset shows the empty state and a disabled quarter selector', async () => {
    sample.fail = true;
    renderShell();
    expect(quarterSelect().disabled).toBe(true);
    expect(optionTexts()).toEqual(['No data']);
    expect(screen.getByText('Load a skills file to get started.')).toBeTruthy();
    expect(status()).toMatch(/sample data could not be loaded/i);

    pick('Quarter file', csvFile('q.csv', quarterCsv('2026-Q1')));
    await waitFor(() => expect(quarterSelect().value).toBe('2026-Q1'));
    expect(quarterSelect().disabled).toBe(false);
    expect(optionTexts()).toEqual(['2026-Q1 (latest)']);
  });

  it('S4 EC: loading a loaded quarter replaces it and selects it', async () => {
    const { data } = renderShell();
    const before = data().indexes;
    pick('Quarter file', csvFile('q2.csv', quarterCsv('2026-Q2', 3)));
    await waitFor(() => expect(status()).toMatch(/Replaced 2026-Q2/));
    expect(quarterSelect().value).toBe('2026-Q2');
    expect(optionTexts()).toEqual(['2026-Q3 (latest)', '2026-Q2', '2026-Q1', '2025-Q4']);
    expect(data().dataset.quarters.get('2026-Q2')).toHaveLength(3);
    expect(data().indexes.get('2026-Q2')!.byPerson.size).toBe(3);
    expect(data().indexes.get('2026-Q3')).toBe(before.get('2026-Q3'));
    expect(data().indexes.get('2026-Q2')).not.toBe(before.get('2026-Q2'));
    expect(data().sources.get('2026-Q2')).toBe('q2.csv');
    expect(data().sources.get('2026-Q3')).toBe('Sample data (fictional)');
  });

  it('S4 EC: only .csv files are read', async () => {
    renderShell();
    for (const name of ['skills.xlsx', 'skills.csv.exe', 'skills']) {
      const file = csvFile(name, quarterCsv('2026-Q4'));
      const read = vi.spyOn(file, 'arrayBuffer');
      pick('Quarter file', file);
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText('Only .csv files can be loaded.')).toBeTruthy();
      expect(read).not.toHaveBeenCalled();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog')).toBeNull();
    }
    expect(optionTexts()).toEqual(SAMPLE_OPTIONS);
    pick('Quarter file', csvFile('SKILLS.CSV', quarterCsv('2026-Q4')));
    await waitFor(() => expect(quarterSelect().value).toBe('2026-Q4'));
  });

  it('S4 EC: the 5 MB limit is checked before reading', async () => {
    renderShell();
    const big = csvFile('big.csv', quarterCsv('2026-Q4'));
    Object.defineProperty(big, 'size', { value: MAX_FILE_BYTES + 1 });
    const read = vi.spyOn(big, 'arrayBuffer');
    pick('Quarter file', big);
    expect(within(await screen.findByRole('dialog')).getByText('The file is larger than 5 MB.')).toBeTruthy();
    expect(read).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    const exact = csvFile('exact.csv', quarterCsv('2026-Q4'));
    Object.defineProperty(exact, 'size', { value: MAX_FILE_BYTES });
    pick('Quarter file', exact);
    await waitFor(() => expect(quarterSelect().value).toBe('2026-Q4'));

    pick('Quarter file', csvFile('empty.csv', ''));
    expect(within(await screen.findByRole('dialog')).getByText('The file is empty')).toBeTruthy();
  });

  it('S4 EC: a cancelled picker changes nothing', async () => {
    renderShell();
    pick('Quarter file');
    await Promise.resolve();
    expect(status()).toBe('');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(loadButtons().every((b) => !b.disabled)).toBe(true);

    pick('Quarter file', csvFile('first.csv', quarterCsv('2026-Q4')), csvFile('second.csv', quarterCsv('2024-Q1')));
    await waitFor(() => expect(status()).toMatch(/first\.csv/));
    expect(optionTexts()).not.toContain('2024-Q1');
  });

  it('S4 EC: the same file can be loaded twice', async () => {
    renderShell();
    const file = csvFile('q4.csv', quarterCsv('2026-Q4'));
    const input = pick('Quarter file', file);
    await waitFor(() => expect(status()).toMatch(/Loaded 2026-Q4/));
    expect(input.value).toBe('');
    fireEvent.change(quarterSelect(), { target: { value: '2025-Q4' } });
    pick('Quarter file', file);
    await waitFor(() => expect(status()).toMatch(/Replaced 2026-Q4/));
    expect(quarterSelect().value).toBe('2026-Q4');
  });

  it('S4 EC: load buttons are disabled while a file is read', async () => {
    renderShell();
    let resolve!: (b: ArrayBuffer) => void;
    const file = csvFile('slow.csv', '');
    file.arrayBuffer = () => new Promise((r) => (resolve = r));
    pick('Quarter file', file);
    await waitFor(() => expect(loadButtons().every((b) => b.disabled)).toBe(true));
    resolve(new TextEncoder().encode(quarterCsv('2026-Q4')).buffer as ArrayBuffer);
    await waitFor(() => expect(quarterSelect().value).toBe('2026-Q4'));
    expect(loadButtons().every((b) => !b.disabled)).toBe(true);
  });

  it('S4 EC: a target file is validated and replaces the targets', async () => {
    const { data } = renderShell();
    const before = data().dataset.targets;
    expect(before.length).toBeGreaterThan(2);
    pick('Target file', csvFile('bad-targets.csv', 'team,skill,target_level\nPayments,SQL,9\n'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Target level must be a whole number/)).toBeTruthy();
    expect(data().dataset.targets).toBe(before);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

    pick('Target file', csvFile('targets.csv', targetCsv));
    await waitFor(() => expect(status()).toBe('Loaded 2 targets from targets.csv.'));
    expect(data().dataset.targets).toEqual([
      { team: 'Payments', skill: 'SQL', targetLevel: 3 },
      { team: 'Mobile', skill: 'SQL', targetLevel: 4 },
    ]);
    expect(quarterSelect().value).toBe('2026-Q3');
  });

  it('S4 EC: a dialog lists all 12,000 errors of a fully bad file', async () => {
    renderShell();
    const lines = Array.from({ length: 12_000 }, (_, i) => `B${i},Bad Person,Payments,Engineer,SQL,Data,x,2026-Q4`);
    pick('Quarter file', csvFile('all-bad.csv', [HEADER, ...lines].join('\n')));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/12,000 rows have problems/)).toBeTruthy();
    const rows = () => dialog.querySelectorAll('tbody tr');
    await waitFor(() => expect(rows()).toHaveLength(12_000), { timeout: 20_000, interval: 200 });
    expect(rows()[11_999].querySelector('td')!.textContent).toBe('12,001');
    expect(optionTexts()).toEqual(SAMPLE_OPTIONS);
  }, 30_000);

  it('S4 EC: hostile file names and filter values render as text', async () => {
    const { container } = renderShell('#/skills?team=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E');
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();
    pick('Quarter file', csvFile('<img src=x onerror=alert(2)>.csv', 'nope'));
    expect(within(await screen.findByRole('dialog')).getByText('<img src=x onerror=alert(2)>.csv was not loaded')).toBeTruthy();
    expect(container.ownerDocument.querySelector('img')).toBeNull();
  });

  it('S4 EC: filter chips and Clear all navigate in one step', async () => {
    renderShell('#/skills?team=Data%20Platform&team=Payments&role=Engineer%2C%20senior');
    const bar = screen.getByRole('region', { name: 'Applied filters' });
    expect(bar.textContent).toContain('Team: Data Platform, Payments');
    const removeRole = within(bar).getByRole('button', { name: 'Remove filter Role: "Engineer, senior"' });
    expect(within(bar).getByRole('button', { name: 'Remove filter Team: Data Platform, Payments' })).toBeTruthy();
    fireEvent.click(removeRole);
    await waitFor(() => expect(location.hash).toBe('#/skills?team=Data%20Platform&team=Payments'));
    fireEvent.click(within(bar).getByRole('button', { name: 'Clear all' }));
    await waitFor(() => expect(within(bar).getByText('No filters applied')).toBeTruthy());
    expect(location.hash).toBe('#/skills');
    expect(within(bar).queryByRole('button', { name: 'Clear all' })).toBeNull();
  });

  it('S4 EC: nav links mark the current screen and unknown routes show Page not found', async () => {
    renderShell('#/team');
    expect(screen.getByRole('link', { name: 'Team' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Overview' }).hasAttribute('aria-current')).toBe(false);
    history.replaceState(null, '', '/#/person/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to the overview' }).getAttribute('href')).toBe('#/');
  });
});
