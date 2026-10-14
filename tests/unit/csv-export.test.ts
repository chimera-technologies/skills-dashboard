import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from '../../src/data/csv';

const fieldsOf = (text: string) => {
  const r = parseCsv(text);
  if (!r.ok) throw new Error(r.error.reason);
  return r.records.map((rec) => rec.fields);
};

describe('S4 CSV writer', () => {
  it('S4 EC: export quoting round-trips through the parser', () => {
    const rows = [
      ['name', 'note'],
      ['a,b', 'say "hi"'],
      ['line1\nline2', 'cr\rhere'],
      ['Zoë', ''],
    ];
    const text = toCsv(rows);
    expect(text).toBe('name,note\r\n"a,b","say ""hi"""\r\n"line1\nline2","cr\rhere"\r\nZoë,\r\n');
    expect(fieldsOf(text)).toEqual(rows);
  });

  it('S4 EC: formula-leading cells are escaped in every row, including the header', () => {
    const text = toCsv([
      ['=head', '+h', '-h', '@h'],
      ['=SUM(A1)', '+1', '-cmd', '@x'],
      ['\tTAB', '\rCR', 'plain', 'x=1'],
    ]);
    expect(fieldsOf(text)).toEqual([
      ["'=head", "'+h", "'-h", "'@h"],
      ["'=SUM(A1)", "'+1", "'-cmd", "'@x"],
      ["'\tTAB", "'\rCR", 'plain', 'x=1'],
    ]);
  });

  it('S4 EC: plain numbers are not escaped and null is empty', () => {
    expect(toCsv([[-0.1, '-0.1', 3, '-2', null, '-1e5', '+5']])).toBe("-0.1,-0.1,3,-2,,'-1e5,'+5\r\n");
  });
});
