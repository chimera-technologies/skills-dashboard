import { useMemo, useState, type ReactNode } from 'react';
import type { CsvCell } from '../data/csv';
import { downloadCsv } from './download';

export type Column<T> = {
  key: string;
  header: string;
  value: (row: T) => CsvCell; // what is sorted and exported
  render?: (row: T) => ReactNode; // what is shown, if not the value
  sortable?: boolean;
  align?: 'left' | 'right';
};

export type Sort = { key: string; dir: 'ascending' | 'descending' };

type Props<T> = { caption: string; columns: Column<T>[]; rows: T[]; initialSort?: Sort; fileName: string };

// Stable (Array.prototype.sort), numbers numeric, strings by locale, null last in both directions.
export function sortRows<T>(rows: T[], column: Column<T>, dir: Sort['dir']): T[] {
  const sign = dir === 'ascending' ? 1 : -1;
  return rows
    .map((row) => ({ row, v: column.value(row) }))
    .sort((a, b) => {
      if (a.v === null || b.v === null) return a.v === b.v ? 0 : a.v === null ? 1 : -1;
      const c = typeof a.v === 'number' && typeof b.v === 'number' ? a.v - b.v : String(a.v).localeCompare(String(b.v));
      return c * sign;
    })
    .map((x) => x.row);
}

const ARROW = { ascending: '▲', descending: '▼' };

// The one table every screen uses: sortable headers and "Download CSV" of exactly what is shown.
export default function DataTable<T>({ caption, columns, rows, initialSort, fileName }: Props<T>) {
  const [sort, setSort] = useState(initialSort);
  const sorted = useMemo(() => {
    const column = sort && columns.find((c) => c.key === sort.key);
    return column ? sortRows(rows, column, sort.dir) : rows;
  }, [rows, columns, sort]);

  const toggle = (key: string) =>
    setSort((s) => ({ key, dir: s?.key === key && s.dir === 'ascending' ? 'descending' : 'ascending' }));
  const download = () => downloadCsv(fileName, [columns.map((c) => c.header), ...sorted.map((row) => columns.map((c) => c.value(row)))]);
  const n = rows.length;

  return (
    <div className="data-table">
      <div className="table-tools">
        <button type="button" className="btn-link" disabled={n === 0} onClick={download}>
          {n === 0 ? 'Download CSV (no rows)' : `Download CSV (${n.toLocaleString('en')} ${n === 1 ? 'row' : 'rows'})`}
        </button>
      </div>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const dir = sort?.key === c.key ? sort.dir : undefined;
              return (
                <th key={c.key} scope="col" className={c.align === 'right' ? 'num' : undefined} aria-sort={c.sortable ? (dir ?? 'none') : undefined}>
                  {c.sortable ? (
                    <button type="button" className="sort-button" onClick={() => toggle(c.key)}>
                      {c.header} <span className="sort" aria-hidden="true">{dir ? ARROW[dir] : '⇅'}</span>
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className={c.align === 'right' ? 'num' : undefined}>
                  {c.render ? c.render(row) : c.value(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
