import { parseCsv } from './csv';
import { QUARTER_RE } from './quarter';
import { REFERENCE } from './reference';
import type { QuarterFileResult, Rating, Reference, RowError, Target, TargetFileResult } from './types';

export const REQUIRED_COLUMNS = ['employee_id', 'name', 'team', 'role', 'skill', 'category', 'level', 'quarter'];
export const TARGET_COLUMNS = ['team', 'skill', 'target_level'];
export const MAX_FIELD_LENGTH = 200;
export const EMPLOYEE_ID_RE = /^[A-Za-z0-9_-]{1,32}$/;
const LEVEL_RE = /^[1-5]$/;

type Report = (column: string | null, reason: string) => void;
// valid holds the trimmed values of this row's present columns that passed their cell check
type RowCheck = (row: number, valid: Map<string, string>, report: Report) => void;

const found = (value: string) => [...value].slice(0, 20).join('');
const isBlank = (fields: string[]) => fields.every((f) => f.trim() === '');

function checkFile(
  text: string,
  columns: string[],
  checkCell: (column: string, value: string) => string | null,
  checkRow: RowCheck,
): { errors: RowError[]; rowCount: number } {
  const fail = (reason: string) => ({ errors: [{ row: 1, column: null, reason }], rowCount: 0 });
  if (text.trim() === '') return fail('The file is empty');
  const parsed = parseCsv(text);
  if (!parsed.ok) return { errors: [{ row: parsed.error.row, column: null, reason: parsed.error.reason }], rowCount: 0 };
  const records = parsed.records.filter((r) => !isBlank(r.fields));
  if (records.length === 0) return fail('The file is empty');
  const [header, ...data] = records;
  if (data.length === 0) return { errors: [{ row: header.row, column: null, reason: 'The file has no data rows' }], rowCount: 0 };

  const errors: RowError[] = [];
  const names = header.fields.map((f) => f.trim().toLowerCase());
  while (names.at(-1) === '') names.pop();
  const index = new Map<string, number>();
  names.forEach((name, i) => {
    if (name === '') return;
    if (index.has(name)) errors.push({ row: header.row, column: name, reason: `Duplicate column: ${name}` });
    else index.set(name, i);
  });
  const present: [string, number][] = [];
  for (const c of columns) {
    const i = index.get(c);
    if (i === undefined) errors.push({ row: header.row, column: c, reason: `Missing column: the header has no ${c} column` });
    else present.push([c, i]);
  }

  const expected = names.length;
  for (const { row, fields } of data) {
    let len = fields.length;
    while (len > expected && fields[len - 1].trim() === '') len--;
    if (len !== expected) {
      errors.push({ row, column: null, reason: `Row has ${len} values, expected ${expected}` });
      continue;
    }
    const rowErrors: RowError[] = [];
    const report: Report = (column, reason) => rowErrors.push({ row, column, reason });
    const valid = new Map<string, string>();
    for (const [column, i] of present) {
      const value = fields[i].trim();
      const reason =
        value === '' ? 'Missing required value'
        : [...value].length > MAX_FIELD_LENGTH ? `Value is longer than ${MAX_FIELD_LENGTH} characters`
        : checkCell(column, value);
      if (reason) report(column, reason);
      else valid.set(column, value);
    }
    checkRow(row, valid, report);
    // by column order, whole-row problems last
    const order = (e: RowError) => (e.column === null ? columns.length : columns.indexOf(e.column));
    errors.push(...rowErrors.sort((a, b) => order(a) - order(b)));
  }
  return { errors, rowCount: data.length };
}

const failed = (errors: RowError[], rowCount: number) =>
  ({ ok: false, errors, rowCount, badRowCount: new Set(errors.map((e) => e.row)).size }) as const;

function referenceCell(ref: Reference, column: string, value: string): string | null {
  if (column === 'team' && !ref.teams.has(value)) return `Unknown team (not in the list of ${ref.teams.size} teams)`;
  if (column === 'skill' && !ref.skills.has(value)) return `Unknown skill (not in the list of ${ref.skills.size} skills)`;
  return null;
}

export function validateQuarterFile(text: string, ref: Reference = REFERENCE): QuarterFileResult {
  let quarter: string | undefined;
  const ratings: Rating[] = [];
  const firstRow = new Map<string, number>(); // employee + skill -> row
  const details = new Map<string, Map<string, { value: string; row: number }>>(); // employee -> column -> first valid value

  const { errors, rowCount } = checkFile(
    text,
    REQUIRED_COLUMNS,
    (column, value) => {
      if (column === 'employee_id' && !EMPLOYEE_ID_RE.test(value)) {
        return 'Employee ID may only contain letters, digits, - and _ (up to 32 characters)';
      }
      if (column === 'category' && !ref.categories.has(value)) {
        return `Unknown category (not one of ${[...ref.categories].join(', ')})`;
      }
      if (column === 'level' && !LEVEL_RE.test(value)) return `Level must be a whole number from 1 to 5 (found "${found(value)}")`;
      if (column === 'quarter' && !QUARTER_RE.test(value)) return 'Quarter must look like 2026-Q3';
      return referenceCell(ref, column, value);
    },
    (row, valid, report) => {
      const id = valid.get('employee_id');
      const skill = valid.get('skill');
      const category = valid.get('category');
      const q = valid.get('quarter');
      if (skill !== undefined && category !== undefined && ref.skills.get(skill) !== category) {
        report('category', `Category does not match the skills list (${skill} is ${ref.skills.get(skill)})`);
        valid.delete('category');
      }
      if (q !== undefined) {
        if (quarter === undefined) quarter = q;
        else if (q !== quarter) {
          report('quarter', `Mixed quarters: this row is ${q}, the file is ${quarter}`);
          valid.delete('quarter');
        }
      }
      if (id === undefined) return;
      let seen = details.get(id);
      if (!seen) details.set(id, (seen = new Map()));
      for (const column of ['name', 'team', 'role']) {
        const value = valid.get(column);
        if (value === undefined) continue;
        const first = seen.get(column);
        if (!first) seen.set(column, { value, row });
        else if (first.value !== value) {
          report(column, `Employee details differ from row ${first.row} (${column})`);
          valid.delete(column);
        }
      }
      if (skill !== undefined) {
        const key = `${id}\u0000${skill}`;
        const first = firstRow.get(key);
        if (first === undefined) firstRow.set(key, row);
        else report(null, `Duplicate row: same employee, skill and quarter as row ${first}`);
      }
      if (valid.size === REQUIRED_COLUMNS.length) {
        ratings.push({
          employeeId: id,
          name: valid.get('name')!,
          team: valid.get('team')!,
          role: valid.get('role')!,
          skill: skill!,
          category: category!,
          level: Number(valid.get('level')),
          quarter: q!,
        });
      }
    },
  );
  if (errors.length > 0) return failed(errors, rowCount);
  return { ok: true, quarter: quarter!, ratings, rowCount };
}

export function validateTargetFile(text: string, ref: Reference = REFERENCE): TargetFileResult {
  const targets: Target[] = [];
  const firstRow = new Map<string, number>(); // team + skill -> row
  const { errors, rowCount } = checkFile(
    text,
    TARGET_COLUMNS,
    (column, value) =>
      column === 'target_level' && !LEVEL_RE.test(value)
        ? `Target level must be a whole number from 1 to 5 (found "${found(value)}")`
        : referenceCell(ref, column, value),
    (row, valid, report) => {
      const team = valid.get('team');
      const skill = valid.get('skill');
      if (team === undefined || skill === undefined) return;
      const key = `${team}\u0000${skill}`;
      const first = firstRow.get(key);
      if (first !== undefined) return report(null, `Duplicate row: same team and skill as row ${first}`);
      firstRow.set(key, row);
      if (valid.has('target_level')) targets.push({ team, skill, targetLevel: Number(valid.get('target_level')) });
    },
  );
  if (errors.length > 0) return failed(errors, rowCount);
  return { ok: true, targets, rowCount };
}
