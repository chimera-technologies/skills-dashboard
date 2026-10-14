// RFC 4180 CSV parser (in-house, SEC-5.2). Records are numbered like spreadsheet rows:
// line breaks inside quotes do not start a new row; blank lines are skipped but keep their number.
export type CsvRecord = { row: number; fields: string[] };
export type CsvResult = { ok: true; records: CsvRecord[] } | { ok: false; error: { row: number; reason: string } };

const QUOTE = 34;
const COMMA = 44;
const LF = 10;
const CR = 13;

export function parseCsv(text: string): CsvResult {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const n = text.length;
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = '';
  let atFieldStart = true;
  let row = 1;
  let i = 0;
  const endRecord = () => {
    if (fields.length > 0 || field !== '') {
      fields.push(field);
      records.push({ row, fields });
    }
    fields = [];
    field = '';
    atFieldStart = true;
  };
  while (i < n) {
    const c = text.charCodeAt(i);
    if (c === QUOTE && atFieldStart) {
      i++;
      for (;;) {
        const close = text.indexOf('"', i);
        if (close === -1) return { ok: false, error: { row, reason: 'A quoted value is never closed' } };
        field += text.slice(i, close);
        i = close + 1;
        if (text.charCodeAt(i) !== QUOTE) break;
        field += '"';
        i++;
      }
      const next = text.charCodeAt(i);
      if (i < n && next !== COMMA && next !== LF && next !== CR) {
        return { ok: false, error: { row, reason: 'Unexpected character after a closing quote' } };
      }
      atFieldStart = false;
    } else if (c === COMMA) {
      fields.push(field);
      field = '';
      atFieldStart = true;
      i++;
    } else if (c === LF || c === CR) {
      endRecord();
      row++;
      i += c === CR && text.charCodeAt(i + 1) === LF ? 2 : 1;
    } else {
      // unquoted run; a '"' inside it is kept as a literal
      let j = i + 1;
      for (let d = text.charCodeAt(j); j < n && d !== COMMA && d !== LF && d !== CR; d = text.charCodeAt(++j));
      field += text.slice(i, j);
      atFieldStart = false;
      i = j;
    }
  }
  endRecord();
  return { ok: true, records };
}

export type CsvCell = string | number | null;

const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;
const NEEDS_QUOTES = /[",\r\n]/;

// Spreadsheet formula injection: a cell starting with = + - @ tab or CR gets a leading ' (plain numbers excepted).
function exportCell(value: CsvCell): string {
  if (value === null) return '';
  const s = String(value);
  return FORMULA_START.test(s) && !PLAIN_NUMBER.test(s) ? `'${s}` : s;
}

// RFC 4180 writer with CRLF line ends; every cell, header included, goes through exportCell.
export function toCsv(rows: CsvCell[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const s = exportCell(value);
          return NEEDS_QUOTES.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
        })
        .join(',') + '\r\n',
    )
    .join('');
}
