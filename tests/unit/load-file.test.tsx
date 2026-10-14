import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import LoadErrorsDialog from '../../src/app/LoadErrorsDialog';
import { parseCsv } from '../../src/data/csv';
import {
  HEADER, csvFile, loadButtons, optionTexts, pick, quarterCsv, quarterSelect, renderShell, status, stubBrowser, targetCsv,
} from './helpers/app';

let downloads: ReturnType<typeof stubBrowser>;
beforeEach(() => {
  downloads = stubBrowser();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const SAMPLE_OPTIONS = ['2026-Q3 (latest)', '2026-Q2', '2026-Q1', '2025-Q4'];
const UTF8_REASON = 'The file must be saved as CSV UTF-8 (in Excel: Save As › CSV UTF-8). It was not loaded.';

async function dialogFor(file: File, label: 'Quarter file' | 'Target file' = 'Quarter file') {
  pick(label, file);
  return screen.findByRole('dialog');
}
const close = (dialog: HTMLElement) => fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
async function csvOf(download: { blob: Blob }) {
  const parsed = parseCsv(await download.blob.text());
  if (!parsed.ok) throw new Error(parsed.error.reason);
  return parsed.records.map((r) => r.fields);
}

describe('S4 load-file flow', () => {
  it('S4 EC-1: Windows-1252 and UTF-16 files are refused with a CSV UTF-8 message and nothing is loaded', async () => {
    renderShell();
    const text = `${HEADER}\nT1,Zoë Test,Payments,Engineer,SQL,Data,3,2026-Q4\n`;
    const cp1252 = Uint8Array.from(text, (c) => (c === 'ë' ? 0xeb : c.charCodeAt(0)));
    const utf16 = new Uint8Array([0xff, 0xfe, ...new Uint8Array(new Uint16Array(Array.from(text, (c) => c.charCodeAt(0))).buffer)]);
    const utf16be = new Uint8Array([0xfe, 0xff, 0, 65]);
    for (const bytes of [cp1252, utf16, utf16be]) {
      const dialog = await dialogFor(csvFile('excel.csv', bytes));
      expect(within(dialog).getByText(UTF8_REASON)).toBeTruthy();
      expect(within(dialog).queryByRole('table')).toBeNull();
      close(dialog);
    }
    expect(optionTexts()).toEqual(SAMPLE_OPTIONS);

    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(text)]);
    pick('Quarter file', csvFile('bom.csv', withBom));
    await waitFor(() => expect(quarterSelect().value).toBe('2026-Q4'));
  });

  it('S4 EC-2: focus returns to the load button after the error dialog closes, also on a second bad load', async () => {
    renderShell();
    for (const [i, label] of [[0, 'Quarter file'], [0, 'Quarter file'], [1, 'Target file']] as const) {
      const button = loadButtons()[i];
      button.focus();
      fireEvent.click(button);
      const dialog = await dialogFor(csvFile('bad.csv', 'x'), label);
      expect(button.disabled).toBe(false);
      expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Close' }));
      close(dialog);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(button);
    }
  });

  it('S4 EC-3: empty, header-only, unclosed-quote and missing-column files use the file-level dialog and one bad row reads 1 row has problems', async () => {
    renderShell();
    const noCategory = HEADER.replace(',category', '');
    const fileLevel = [
      ['', 'The file is empty'],
      [`${HEADER}\n`, 'The file has no data rows'],
      [`${HEADER}\nT1,"Unclosed,Payments\n`, 'A quoted value is never closed'],
      [`${noCategory}\nT1,Test,Payments,Engineer,SQL,3,2026-Q4\n`, 'Missing column: the header has no category column'],
    ];
    for (const [text, reason] of fileLevel) {
      const dialog = await dialogFor(csvFile('f.csv', text));
      expect(within(dialog).getByRole('heading', { name: 'f.csv was not loaded' })).toBeTruthy();
      expect(within(dialog).getByText(reason)).toBeTruthy();
      expect(within(dialog).queryByRole('table')).toBeNull();
      expect(dialog.textContent).not.toMatch(/rows? (has|have) problems|File checked/);
      close(dialog);
    }

    const one = `${quarterCsv('2026-Q4', 1)}\nT9,Other,Payments,Engineer,SQL,Data,7,2026-Q4\n`;
    const dialog = await dialogFor(csvFile('one.csv', one));
    expect(dialog.textContent).toContain('1 row has problems. Nothing was loaded and the data on screen has not changed.');
    expect(dialog.textContent).toContain('File checked: 2 rows · 1 row with problems · file kept in this browser only, not uploaded or saved');
    const cells = within(dialog).getAllByRole('row')[1].querySelectorAll('td');
    expect([...cells].map((c) => c.textContent)).toEqual(['3', 'level', 'Level must be a whole number from 1 to 5 (found "7")']);
    close(dialog);

    // header problems plus bad rows: columns listed above the table, counts exclude the header row
    const both = `${HEADER},level\nT1,A,Payments,Engineer,SQL,Data,3,2026-Q4,3\nT2,B,Payments,Engineer,SQL,Data,9,2026-Q4,9\nT3,C,Payments,Engineer,Nope,Data,9,2026-Q4,9\n`;
    const d2 = await dialogFor(csvFile('both.csv', both));
    expect(d2.textContent).toContain('2 rows have problems.');
    expect(d2.textContent).toContain('File checked: 3 rows · 2 rows with problems');
    expect(within(d2).getByText('Problems with the columns')).toBeTruthy();
    expect(within(d2).getByText('Duplicate column: level')).toBeTruthy();
    const rows = within(d2).getAllByRole('row').slice(1);
    expect(rows.map((r) => r.querySelector('td')!.textContent)).toEqual(['3', '4']);
    expect(rows[1].querySelectorAll('td')[1].textContent).toBe('skill\nlevel');
  });

  it('S4 EC-5: a 5 MB file with every cell bad opens the dialog at once and eventually lists every bad row', async () => {
    renderShell();
    // about 85 bytes a row, so about 60,000 rows and 6 problems each
    const line = '!bad-id!,Some Name,Unknown Team X,Engineer,Unknown Skill X,Unknown Category,9,2026-Q9';
    const count = Math.floor((5 * 1024 * 1024 - HEADER.length) / (line.length + 1));
    const text = [HEADER, ...Array.from({ length: count }, () => line)].join('\n');
    expect(text.length).toBeLessThanOrEqual(5 * 1024 * 1024);
    const dialog = await dialogFor(csvFile('huge.csv', text));
    const shown = () => dialog.querySelectorAll('tbody tr');
    expect(shown()).toHaveLength(500);
    expect(within(dialog).getByText(`Listing 500 of ${count.toLocaleString('en')} rows…`)).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(shown()).toHaveLength(count), { timeout: 240_000, interval: 500 });
    expect(dialog.textContent).not.toContain('Listing');
    expect(shown()[count - 1].querySelector('td')!.textContent).toBe((count + 1).toLocaleString('en'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Download problem list (CSV)' }));
    const csv = await csvOf(downloads[0]);
    expect(csv.length - 1).toBe(count * 6);
  }, 300_000);

  it('S4 EC-7: a file that cannot be read shows a dialog and re-enables the buttons', async () => {
    renderShell();
    const file = csvFile('gone.csv', quarterCsv('2026-Q4'));
    file.arrayBuffer = () => Promise.reject(new DOMException('gone', 'NotReadableError'));
    const button = loadButtons()[0];
    button.focus();
    fireEvent.click(button);
    const input = pick('Quarter file', file);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('The file could not be read. Check it still exists and try again.')).toBeTruthy();
    expect(loadButtons().every((b) => !b.disabled)).toBe(true);
    expect(input.value).toBe('');
    close(dialog);
    expect(document.activeElement).toBe(button);
    expect(optionTexts()).toEqual(SAMPLE_OPTIONS);
  });

  it('S4 EC-8: loading the same file twice replaces the status text node each time', async () => {
    renderShell();
    const file = csvFile('targets.csv', targetCsv);
    pick('Target file', file);
    await waitFor(() => expect(status()).toBe('Loaded 2 targets from targets.csv.'));
    const region = screen.getByRole('status');
    const first = region.firstElementChild;
    pick('Target file', file);
    await waitFor(() => expect(region.firstElementChild).not.toBe(first));
    expect(status()).toBe('Loaded 2 targets from targets.csv.');
    expect(screen.getByRole('status')).toBe(region);
  });

  it("S4 BUG-1: a duplicated formula-leading header gives a problem-list CSV whose Column and Reason cells start with '", async () => {
    renderShell();
    const text = `${HEADER},=cmd,=cmd\nT1,A,Payments,Engineer,SQL,Data,3,2026-Q4,1,2\n`;
    const dialog = await dialogFor(csvFile('formula.csv', text));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Download problem list (CSV)' }));
    expect(downloads[0].name).toBe('formula-problems.csv');
    expect(await csvOf(downloads[0])).toEqual([
      ['Row', 'Column', 'Reason'],
      ['1', "'=cmd", 'Duplicate column: =cmd'],
    ]);
    close(dialog);
    cleanup();

    // a reason that itself starts with a formula character is escaped too
    const errors = [{ row: 2, column: '@x', reason: '=HYPERLINK("http://x")' }];
    render(<LoadErrorsDialog fileName="x.csv" result={{ ok: false, errors, rowCount: 1, badRowCount: 1 }} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download problem list (CSV)' }));
    expect((await csvOf(downloads[1]))[1]).toEqual(['2', "'@x", "'=HYPERLINK(\"http://x\")"]);
  });
});
