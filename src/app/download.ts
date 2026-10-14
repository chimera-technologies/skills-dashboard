import { toCsv, type CsvCell } from '../data/csv';

// Saves rows as a CSV file in the browser (UTF-8 BOM so Excel reads names like "Zoë"); nothing leaves the page.
export function downloadCsv(fileName: string, rows: CsvCell[][]) {
  const url = URL.createObjectURL(new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.replace(/[^A-Za-z0-9._-]/g, '-');
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
