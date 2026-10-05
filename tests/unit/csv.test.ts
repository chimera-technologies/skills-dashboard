import { describe, expect, it } from 'vitest';
import { parseCsv } from '../../src/data/csv';

const records = (text: string) => {
  const r = parseCsv(text);
  if (!r.ok) throw new Error(r.error.reason);
  return r.records;
};

describe('S2 CSV parser', () => {
  it('S2 EC: parser handles RFC 4180 quoting and line endings', () => {
    expect(records('a,b\n1,2\n')).toEqual([
      { row: 1, fields: ['a', 'b'] },
      { row: 2, fields: ['1', '2'] },
    ]);
    // quoted comma, "" escape, line break inside quotes (still one row)
    expect(records('a,b\n"x, y","say ""hi"""\n"line1\nline2",z\nlast,row')).toEqual([
      { row: 1, fields: ['a', 'b'] },
      { row: 2, fields: ['x, y', 'say "hi"'] },
      { row: 3, fields: ['line1\nline2', 'z'] },
      { row: 4, fields: ['last', 'row'] },
    ]);
    // CRLF, lone CR, blank lines skipped with numbers kept, missing final newline
    expect(records('a\r\n1\r\r\n\n2\r3')).toEqual([
      { row: 1, fields: ['a'] },
      { row: 2, fields: ['1'] },
      { row: 5, fields: ['2'] },
      { row: 6, fields: ['3'] },
    ]);
    // BOM stripped, empty fields kept, literal quote inside an unquoted field
    expect(records('﻿a,,b\nx"y,"",\n')).toEqual([
      { row: 1, fields: ['a', '', 'b'] },
      { row: 2, fields: ['x"y', '', ''] },
    ]);
    expect(records('')).toEqual([]);
  });

  it('S2 EC: malformed quoting rejects the file with the row number', () => {
    expect(parseCsv('a,b\n1,2\n"open,3\n4,5\n')).toEqual({
      ok: false,
      error: { row: 3, reason: 'A quoted value is never closed' },
    });
    expect(parseCsv('a,b\n"x"y,2\n')).toEqual({
      ok: false,
      error: { row: 2, reason: 'Unexpected character after a closing quote' },
    });
  });
});
