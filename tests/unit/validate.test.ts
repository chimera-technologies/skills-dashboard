import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { validateQuarterFile, validateTargetFile } from '../../src/data/validate';
import { REFERENCE } from '../../src/data/reference';
import type { QuarterFileResult, RowError } from '../../src/data/types';

const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures/csv', name), 'utf8');
const HEADER = 'employee_id,name,team,role,skill,category,level,quarter';
const GOOD = 'E0001,Asha Rao,Data Platform,Senior engineer,Python,Development,4,2026-Q3';
const file = (...rows: string[]) => [HEADER, ...rows].join('\n') + '\n';
// a good row with one column changed
const row = (changes: Partial<Record<string, string>>) => {
  const cols = HEADER.split(',');
  const values = GOOD.split(',');
  return cols.map((c, i) => changes[c] ?? values[i]).join(',');
};
const errorsOf = (r: QuarterFileResult | ReturnType<typeof validateTargetFile>): RowError[] => {
  if (r.ok) throw new Error('expected errors');
  return r.errors;
};
const ok = (r: QuarterFileResult) => {
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r;
};
const levelMsg = (v: string) => `Level must be a whole number from 1 to 5 (found "${v}")`;

describe('S2 quarter file validation', () => {
  it('S2 AC-1: a valid file produces ratings for one quarter', () => {
    const r = ok(validateQuarterFile(fixture('valid-quarter.csv')));
    expect(r.quarter).toBe('2026-Q3');
    expect(r.rowCount).toBe(4);
    expect(r.ratings).toEqual([
      { employeeId: 'E0001', name: 'Zoë Ñúñez', team: 'Data Platform', role: 'Consultant, Data', skill: 'Python', category: 'Development', level: 4, quarter: '2026-Q3' },
      { employeeId: 'E0001', name: 'Zoë Ñúñez', team: 'Data Platform', role: 'Consultant, Data', skill: 'SQL', category: 'Data', level: 5, quarter: '2026-Q3' },
      { employeeId: 'E0002', name: 'ليلى حداد', team: 'Payments', role: 'Senior engineer', skill: 'Kubernetes', category: 'Cloud', level: 1, quarter: '2026-Q3' },
      { employeeId: 'E-0_3', name: 'Kai 🚀 Moana', team: 'Analytics', role: 'Engineer', skill: 'Agile delivery', category: 'Delivery', level: 3, quarter: '2026-Q3' },
    ]);
    // same data with the columns in another order gives the same ratings
    const reordered = 'quarter,level,category,skill,role,team,name,employee_id\n' +
      '2026-Q3,4,Development,Python,Senior engineer,Data Platform,Asha Rao,E0001\n';
    expect(ok(validateQuarterFile(reordered)).ratings).toEqual(ok(validateQuarterFile(file(GOOD))).ratings);
  });

  it('S2 AC-2: every bad row is listed with row number and reason and nothing is loaded', () => {
    const r = validateQuarterFile(fixture('bad-quarter.csv'));
    expect(r.ok).toBe(false);
    expect(r).not.toHaveProperty('ratings');
    expect(r).not.toHaveProperty('quarter');
    expect(errorsOf(r)).toEqual([
      { row: 3, column: 'level', reason: levelMsg('0') },
      { row: 4, column: 'level', reason: levelMsg('6') },
      { row: 5, column: 'level', reason: levelMsg('3.5') },
      { row: 6, column: 'level', reason: levelMsg('four') },
      { row: 7, column: 'skill', reason: 'Unknown skill (not in the list of 40 skills)' },
      { row: 8, column: 'team', reason: 'Unknown team (not in the list of 12 teams)' },
      { row: 9, column: 'category', reason: 'Unknown category (not one of Cloud, Data, Development, Delivery, Leadership)' },
      { row: 10, column: 'quarter', reason: 'Mixed quarters: this row is 2026-Q2, the file is 2026-Q3' },
      { row: 11, column: 'name', reason: 'Missing required value' },
      { row: 12, column: null, reason: 'Duplicate row: same employee, skill and quarter as row 2' },
      { row: 14, column: 'team', reason: 'Employee details differ from row 13 (team)' },
      { row: 15, column: 'category', reason: 'Category does not match the skills list (Kubernetes is Cloud)' },
    ]);
    expect(r).toMatchObject({ rowCount: 14, badRowCount: 12 });
    for (const e of errorsOf(r)) expect(e.reason).not.toMatch(/Asha|Rao|Ben|Osei|Chen|Wei-Lin/);

    const m = validateQuarterFile(fixture('missing-column.csv'));
    expect(m).not.toHaveProperty('ratings');
    expect(errorsOf(m)).toEqual([
      { row: 1, column: 'category', reason: 'Missing column: the header has no category column' },
      { row: 3, column: 'level', reason: levelMsg('3.5') },
    ]);
    expect(m).toMatchObject({ rowCount: 3, badRowCount: 2 });

    // several problems on one row count it once; a value of only spaces is missing
    const multi = validateQuarterFile(file(GOOD, row({ employee_id: 'E0009', team: 'Nowhere', level: '9', role: '   ' })));
    expect(errorsOf(multi).map((e) => [e.row, e.column])).toEqual([[3, 'team'], [3, 'role'], [3, 'level']]);
    expect(multi).toMatchObject({ badRowCount: 1 });
  });

  it('S2 EC: empty and header-only files are rejected', () => {
    for (const t of ['', '  \n\r\n ', '﻿']) {
      expect(validateQuarterFile(t)).toEqual({ ok: false, errors: [{ row: 1, column: null, reason: 'The file is empty' }], rowCount: 0, badRowCount: 1 });
    }
    expect(errorsOf(validateQuarterFile(HEADER + '\n\n'))).toEqual([{ row: 1, column: null, reason: 'The file has no data rows' }]);
  });

  it('S2 EC: a single-row file loads', () => {
    const r = ok(validateQuarterFile(HEADER + '\n' + GOOD));
    expect(r.ratings).toHaveLength(1);
    expect(r.rowCount).toBe(1);
  });

  it('S2 EC-1: separator-only rows are skipped like blank lines', () => {
    const r = ok(validateQuarterFile(file(',,,,,,,', GOOD, ' , ,,,,,,', '', row({ skill: 'SQL', category: 'Data' }))));
    expect(r.rowCount).toBe(2);
    // row numbers of skipped rows are kept
    expect(errorsOf(validateQuarterFile(file(',,,,,,,', GOOD, row({ level: '7' }))))[0].row).toBe(4);
  });

  it('S2 EC-2: employee ids with URL-unsafe characters are rejected', () => {
    const reason = 'Employee ID may only contain letters, digits, - and _ (up to 32 characters)';
    for (const id of ['E/1', 'E#1', 'E?1', 'E 1', '../x', 'É1', 'a'.repeat(33)]) {
      const errs = errorsOf(validateQuarterFile(file(row({ employee_id: id.includes(' ') ? `"${id}"` : id }))));
      expect(errs, id).toEqual([{ row: 2, column: 'employee_id', reason }]);
    }
    ok(validateQuarterFile(file(row({ employee_id: 'a'.repeat(32) }))));
  });

  it('S2 EC-3: dependent checks are skipped when employee_id or skill is missing', () => {
    expect(errorsOf(validateQuarterFile(fixture('missing-employee-id.csv')))).toEqual([
      { row: 1, column: 'employee_id', reason: 'Missing column: the header has no employee_id column' },
    ]);
    expect(errorsOf(validateQuarterFile(fixture('missing-skill.csv')))).toEqual([
      { row: 1, column: 'skill', reason: 'Missing column: the header has no skill column' },
    ]);
  });

  it('S2 EC-4: non-ASCII values survive and the 200-character limit counts code points', () => {
    const names = ok(validateQuarterFile(fixture('valid-quarter.csv'))).ratings.map((r) => r.name);
    expect(names).toContain('Zoë Ñúñez');
    expect(names).toContain('ليلى حداد');
    expect(names).toContain('Kai 🚀 Moana');
    const name200 = '🚀'.repeat(100) + 'é'.repeat(100);
    expect(ok(validateQuarterFile(file(row({ name: name200 })))).ratings[0].name).toBe(name200);
    expect(errorsOf(validateQuarterFile(file(row({ name: name200 + 'x' }))))).toEqual([
      { row: 2, column: 'name', reason: 'Value is longer than 200 characters' },
    ]);
  });

  it('S2 EC-5: team, skill and category values match the lists exactly after trimming', () => {
    expect(errorsOf(validateQuarterFile(file(row({ team: 'data platform' }), row({ employee_id: 'E2', skill: 'python ' }), row({ employee_id: 'E3', team: 'Data  Platform' }), row({ employee_id: 'E4', category: 'development' }))))).toEqual([
      { row: 2, column: 'team', reason: 'Unknown team (not in the list of 12 teams)' },
      { row: 3, column: 'skill', reason: 'Unknown skill (not in the list of 40 skills)' },
      { row: 4, column: 'team', reason: 'Unknown team (not in the list of 12 teams)' },
      { row: 5, column: 'category', reason: 'Unknown category (not one of Cloud, Data, Development, Delivery, Leadership)' },
    ]);
    ok(validateQuarterFile(file(row({ team: '  Data Platform ', skill: ' Python' }))));
  });

  it('S2 EC-6: a trailing comma on the header or the rows is tolerated', () => {
    ok(validateQuarterFile(HEADER + ',\n' + GOOD + '\n'));
    ok(validateQuarterFile(HEADER + '\n' + GOOD + ',\n'));
    ok(validateQuarterFile(HEADER + ',,\n' + GOOD + ',\n'));
    expect(errorsOf(validateQuarterFile(HEADER + '\n' + GOOD + ',extra\n'))).toEqual([
      { row: 2, column: null, reason: 'Row has 9 values, expected 8' },
    ]);
  });

  it('S2 BUG-1: rows with missing or invalid keys are not reported as duplicates or detail mismatches', () => {
    const errs = errorsOf(validateQuarterFile(file(
      row({ employee_id: '""' }),
      row({ employee_id: '""' }),
      row({ employee_id: 'E/9' }),
      row({ employee_id: 'E/9' }),
      row({ employee_id: 'E0005', team: 'Nowhere' }),
      row({ employee_id: 'E0005', skill: 'SQL', category: 'Data' }),
      row({ employee_id: 'E0005', skill: 'Go' }),
      row({ employee_id: 'E0006', skill: 'Cobol' }),
      row({ employee_id: 'E0006', skill: 'Cobol' }),
    )));
    expect(errs.map((e) => [e.row, e.column, e.reason.split(' ')[0]])).toEqual([
      [2, 'employee_id', 'Missing'],
      [3, 'employee_id', 'Missing'],
      [4, 'employee_id', 'Employee'],
      [5, 'employee_id', 'Employee'],
      [6, 'team', 'Unknown'],
      [9, 'skill', 'Unknown'],
      [10, 'skill', 'Unknown'],
    ]);
  });

  it('S2 EC: header with extra, duplicate or differently cased columns', () => {
    const r = ok(validateQuarterFile('﻿ Employee_ID ,NAME,Team,Role,Skill,Category,Level,Quarter,notes\n' + GOOD + ',anything\n'));
    expect(r.ratings[0]).toMatchObject({ employeeId: 'E0001', level: 4 });
    expect(errorsOf(validateQuarterFile(HEADER + ',level\n' + GOOD + ',4\n'))).toEqual([
      { row: 1, column: 'level', reason: 'Duplicate column: level' },
    ]);
  });

  it('S2 EC: rows with the wrong number of values', () => {
    expect(errorsOf(validateQuarterFile(file('E0001,Asha Rao,Data Platform,Senior engineer,Python,Development,4', GOOD + ',x,y')))).toEqual([
      { row: 2, column: null, reason: 'Row has 7 values, expected 8' },
      { row: 3, column: null, reason: 'Row has 10 values, expected 8' },
    ]);
  });

  it('S2 EC: level boundaries', () => {
    expect(ok(validateQuarterFile(file(row({ level: '1' }), row({ level: '5', skill: 'SQL', category: 'Data' })))).ratings.map((r) => r.level)).toEqual([1, 5]);
    for (const v of ['0', '6', '3.5', '04', '4.0', '-1', 'four', '+3', '1e0']) {
      expect(errorsOf(validateQuarterFile(file(row({ level: v })))), v).toEqual([{ row: 2, column: 'level', reason: levelMsg(v) }]);
    }
    expect(errorsOf(validateQuarterFile(file(row({ level: 'x'.repeat(50) }))))[0].reason).toBe(levelMsg('x'.repeat(20)));
  });

  it('S2 EC: quarter format', () => {
    for (const q of ['2026-q3', '2026-Q5', '26-Q3', '2026-Q0', '2026Q3']) {
      expect(errorsOf(validateQuarterFile(file(row({ quarter: q })))), q).toEqual([{ row: 2, column: 'quarter', reason: 'Quarter must look like 2026-Q3' }]);
    }
    // the file's quarter is the first data row with a valid quarter
    const r = validateQuarterFile(file(row({ quarter: 'bad' }), row({ quarter: '2026-Q4', skill: 'SQL', category: 'Data' }), row({ skill: 'Go' })));
    expect(errorsOf(r)).toEqual([
      { row: 2, column: 'quarter', reason: 'Quarter must look like 2026-Q3' },
      { row: 4, column: 'quarter', reason: 'Mixed quarters: this row is 2026-Q3, the file is 2026-Q4' },
    ]);
  });

  it("S2 EC: category must match the skill's category", () => {
    expect(errorsOf(validateQuarterFile(file(row({ skill: 'Kubernetes', category: 'Data' }))))).toEqual([
      { row: 2, column: 'category', reason: 'Category does not match the skills list (Kubernetes is Cloud)' },
    ]);
  });

  it('S2 EC: hostile values are rejected or kept as plain text', () => {
    const errs = errorsOf(validateQuarterFile(file(
      row({ team: '__proto__' }),
      row({ employee_id: 'E2', skill: 'constructor' }),
      row({ employee_id: 'E3', category: 'toString' }),
      row({ employee_id: 'E4', role: 'x'.repeat(201) }),
    )));
    expect(errs.map((e) => [e.row, e.column, e.reason])).toEqual([
      [2, 'team', 'Unknown team (not in the list of 12 teams)'],
      [3, 'skill', 'Unknown skill (not in the list of 40 skills)'],
      [4, 'category', 'Unknown category (not one of Cloud, Data, Development, Delivery, Leadership)'],
      [5, 'role', 'Value is longer than 200 characters'],
    ]);
    const r = ok(validateQuarterFile(file(
      row({ employee_id: '__proto__', name: '<script>alert(1)</script>' }),
      row({ employee_id: 'toString', name: '"=HYPERLINK(""http://x"",""y"")"', skill: 'SQL', category: 'Data' }),
    )));
    expect(r.ratings.map((x) => [x.employeeId, x.name])).toEqual([
      ['__proto__', '<script>alert(1)</script>'],
      ['toString', '=HYPERLINK("http://x","y")'],
    ]);
  });

  it('S2 EC: target file validation', () => {
    const T = 'team,skill,target_level';
    const t = validateTargetFile(`${T}\nData Platform,Python,3\nPayments, SQL ,5\n`);
    expect(t).toEqual({ ok: true, rowCount: 2, targets: [
      { team: 'Data Platform', skill: 'Python', targetLevel: 3 },
      { team: 'Payments', skill: 'SQL', targetLevel: 5 },
    ] });
    expect(errorsOf(validateTargetFile(''))).toEqual([{ row: 1, column: null, reason: 'The file is empty' }]);
    expect(errorsOf(validateTargetFile('team,target_level\nPayments,3\n'))).toEqual([
      { row: 1, column: 'skill', reason: 'Missing column: the header has no skill column' },
    ]);
    const bad = validateTargetFile(`${T}\nAtlantis,Python,3\nPayments,Cobol,3\nPayments,SQL,0\nPayments,Go,\nPayments,Python,3\nPayments,Python,4\n`);
    expect(errorsOf(bad)).toEqual([
      { row: 2, column: 'team', reason: 'Unknown team (not in the list of 12 teams)' },
      { row: 3, column: 'skill', reason: 'Unknown skill (not in the list of 40 skills)' },
      { row: 4, column: 'target_level', reason: 'Target level must be a whole number from 1 to 5 (found "0")' },
      { row: 5, column: 'target_level', reason: 'Missing required value' },
      { row: 7, column: null, reason: 'Duplicate row: same team and skill as row 6' },
    ]);
    expect(bad).not.toHaveProperty('targets');
  });

  it('S2 EC: validation is pure and repeatable', () => {
    const before = { teams: [...REFERENCE.teams], skills: [...REFERENCE.skills], categories: [...REFERENCE.categories] };
    const text = fixture('bad-quarter.csv');
    expect(validateQuarterFile(text)).toEqual(validateQuarterFile(text));
    const good = fixture('valid-quarter.csv');
    expect(validateQuarterFile(good)).toEqual(validateQuarterFile(good));
    expect({ teams: [...REFERENCE.teams], skills: [...REFERENCE.skills], categories: [...REFERENCE.categories] }).toEqual(before);
  });
});
