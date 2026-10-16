import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import DataTable, { type Column } from '../../src/app/DataTable';
import { parseCsv } from '../../src/data/csv';

type Row = { name: string; level: number | null; change: number };

const columns: Column<Row>[] = [
  { key: 'name', header: 'Name', value: (r) => r.name, sortable: true },
  { key: 'level', header: 'Level', value: (r) => r.level, sortable: true, align: 'right' },
  { key: 'change', header: 'Change', value: (r) => r.change, align: 'right' },
];

const rows: Row[] = [
  { name: '=SUM(A1)', level: 3, change: 0.2 },
  { name: '+1', level: null, change: 0 },
  { name: '-cmd', level: 10, change: -0.1 },
  { name: '@x', level: 9, change: 1 },
  { name: 'a,b', level: 3, change: 0.5 },
  { name: 'say "hi"', level: 1, change: 2 },
];

let blobs: Blob[] = [];
let names: string[] = [];

beforeEach(() => {
  blobs = [];
  names = [];
  URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), 'blob:test'));
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    names.push(this.download);
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const bodyText = () =>
  within(screen.getByRole('table')).getAllByRole('row').slice(1).map((tr) => within(tr).getAllByRole('cell').map((td) => td.textContent));

async function downloaded() {
  fireEvent.click(screen.getByRole('button', { name: /^Download CSV/ }));
  const parsed = parseCsv(await blobs.at(-1)!.text());
  if (!parsed.ok) throw new Error(parsed.error.reason);
  return parsed.records.map((r) => r.fields);
}

describe('S4 shared table', () => {
  it('S4 AC-3: downloaded CSV matches the visible rows, columns and sort and escapes formula-leading characters', async () => {
    render(<DataTable caption="People" columns={columns} rows={rows} fileName="people.csv" />);
    fireEvent.click(screen.getByRole('button', { name: /^Level/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Level/ }));
    expect(screen.getByRole('columnheader', { name: /^Level/ }).getAttribute('aria-sort')).toBe('descending');
    const visible = bodyText();
    expect(visible.map((r) => r[0])).toEqual(['-cmd', '@x', '=SUM(A1)', 'a,b', 'say "hi"', '+1']);
    const csv = await downloaded();
    expect(csv[0]).toEqual(['Name', 'Level', 'Change']);
    const unescape = (v: string) => (/^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v);
    expect(csv.slice(1).map((r) => r.map(unescape))).toEqual(visible);
    expect(csv.slice(1).map((r) => r[0])).toEqual(["'-cmd", "'@x", "'=SUM(A1)", 'a,b', 'say "hi"', "'+1"]);
    expect(csv[1][2]).toBe('-0.1');
    expect(csv.at(-1)![1]).toBe('');
    expect(names).toEqual(['people.csv']);
    expect(screen.getByRole('button', { name: 'Download CSV (6 rows)' })).toBeTruthy();
  });

  it('S4 EC: sorting is stable, numeric and puts empty values last', () => {
    render(<DataTable caption="People" columns={columns} rows={rows} fileName="p.csv" />);
    const level = () => screen.getByRole('button', { name: /^Level/ });
    fireEvent.click(level());
    expect(bodyText().map((r) => r[0])).toEqual(['say "hi"', '=SUM(A1)', 'a,b', '@x', '-cmd', '+1']);
    fireEvent.click(level());
    expect(bodyText().map((r) => r[0])).toEqual(['-cmd', '@x', '=SUM(A1)', 'a,b', 'say "hi"', '+1']);
    expect(screen.getByRole('columnheader', { name: /^Name/ }).getAttribute('aria-sort')).toBe('none');
    expect(screen.getByRole('columnheader', { name: 'Change' }).hasAttribute('aria-sort')).toBe(false);
  });

  it('S4 EC: an empty table disables Download CSV', () => {
    render(<DataTable caption="People" columns={columns} rows={[]} fileName="p.csv" />);
    const button = screen.getByRole('button', { name: 'Download CSV (no rows)' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('S4 EC: download file names are sanitised', async () => {
    render(<DataTable caption="T" columns={columns} rows={rows.slice(0, 1)} fileName={'team-R&D/../<x> ü.csv'} />);
    await downloaded();
    expect(names).toEqual(['team-R-D-..--x---.csv']);
    expect(screen.getByRole('button', { name: 'Download CSV (1 row)' })).toBeTruthy();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('S4 EC: hostile cell values render as text', () => {
    const { container } = render(
      <DataTable caption="T" columns={columns} rows={[{ name: '<img src=x onerror=alert(1)>', level: 1, change: 0 }]} fileName="t.csv" />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();
  });

  it('S5 EC: a csv: false column is shown but not exported', async () => {
    const withBar: Column<Row>[] = [...columns, { key: 'bar', header: 'Bar', value: (r) => r.level, render: () => '■', csv: false }];
    render(<DataTable caption="T" columns={withBar} rows={rows.slice(0, 1)} fileName="t.csv" />);
    expect(screen.getByRole('columnheader', { name: 'Bar' })).toBeTruthy();
    expect(bodyText()[0][3]).toBe('■');
    expect(await downloaded()).toEqual([['Name', 'Level', 'Change'], ["'=SUM(A1)", '3', '0.2']]);
  });
});
