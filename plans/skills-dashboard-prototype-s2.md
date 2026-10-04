---
id: skills-dashboard-prototype-s2
spec: specs/skills-dashboard-prototype.md
story: S2
jira: SCRUM-15
branch: story/scrum-15-csv-loader
created: 2026-10-04
---

# Plan: S2 CSV loader, validation and sample data

## Story
The data layer the screens build on: an in-house RFC 4180 CSV parser, a
validator that turns a quarter file into ratings for one quarter (or a list of
every bad row with its row number, column and reason, loading nothing), a
target-file validator, the reference lists of 12 teams, 40 skills and
5 categories, and deterministic fictional sample files for 4 consecutive
quarters plus a target file. Covers REQ-1, REQ-2, REQ-3, and the data side of
SEC-2.3, SEC-4.1 and SEC-5.2. Pure TypeScript, no UI.

## Design
S2 has no screen of its own; it produces the error data the
`load-file-errors` modal (built in S4) shows.
- load-file-errors: designs/skills-dashboard-prototype/screens/load-file-errors.png.
  Each error is `{ row, column, reason }` so S4 can render the Row, Column
  ("—" when `column` is `null`) and Reason columns as mocked. Rows are
  numbered as in a spreadsheet: the header is row 1, the first data row is
  row 2 (the mockup's "Missing column" error is on row 1). Reason texts
  match the mockup copy: `Missing column: the header has no category column`,
  `Level must be a whole number from 1 to 5 (found "3.5")`,
  `Unknown skill (not in the list of 40 skills)`,
  `Unknown team (not in the list of 12 teams)`,
  `Mixed quarters: this row is 2026-Q3, the file is 2026-Q4`,
  `Missing required value`,
  `Duplicate row: same employee, skill and quarter as row 9301`.
  No message contains a name or any other value from the row except the
  bad level (truncated to 20 characters) and the quarters (SEC-2.3).
  The result also carries `rowCount` (data rows checked) and
  `badRowCount` (distinct rows with problems) for the modal's summary line
  ("11,842 rows · 7 rows with problems"); number formatting is S4's.

## Files
| File | Change |
|---|---|
| src/data/types.ts | new: `Rating` (`employeeId`, `name`, `team`, `role`, `skill`, `category`, `level` 1–5 number, `quarter`), `Target` (`team`, `skill`, `targetLevel`), `RowError` (`row`, `column` string or null, `reason`), `QuarterFileResult` and `TargetFileResult` (discriminated on `ok`), `Dataset` (`quarters: Map<string, Rating[]>`, `targets: Target[]`), `Reference` |
| src/data/csv.ts | new: `parseCsv(text)` RFC 4180 parser, single pass over characters: strips a leading BOM; handles `,` separators, quoted fields with `""` escapes, commas and line breaks inside quotes, CRLF, LF and lone CR; returns records `{ row, fields }` numbered by record (header = 1), skipping blank records but keeping their numbers; returns a `{ row, reason }` error for an unclosed quote (row where it opened) or a character after a closing quote. A `"` inside an unquoted field is kept as a literal. No dependency (SEC-5.2) |
| src/data/quarter.ts | new: `QUARTER_RE` (`^\d{4}-Q[1-4]$`), `previousQuarter('2026-Q1') = '2025-Q4'`, `compareQuarters` for sorting |
| src/data/reference/teams.json | new: the 12 invented team names (OQ-6) |
| src/data/reference/skills.json | new: 40 invented-for-the-prototype skills, each `{ "skill", "category" }`, 8 per category across Cloud, Data, Development, Delivery, Leadership |
| src/data/reference.ts | new: builds the default `Reference` (`teams: Set`, `skills: Map<skill, category>`, `categories: Set` of the 5 names) from the JSON; lookups use `Set`/`Map`, never plain objects, so `__proto__` or `constructor` are just unknown values |
| src/data/validate.ts | new: `validateQuarterFile(text, ref = REFERENCE)` and `validateTargetFile(text, ref = REFERENCE)`; return `{ ok: true, quarter, ratings, rowCount }` / `{ ok: true, targets, rowCount }`, or `{ ok: false, errors, rowCount, badRowCount }` with errors sorted by row then column order. Rules in Steps 3–4; constants `REQUIRED_COLUMNS`, `TARGET_COLUMNS`, `MAX_FIELD_LENGTH = 200` (counted in code points, `[...value].length`), `EMPLOYEE_ID_RE = /^[A-Za-z0-9_-]{1,32}$/` |
| src/data/sample.ts | new: imports the bundled sample CSVs with Vite `?raw` (no network, SEC-7.1), exports `SAMPLE_FILES` (file name → text) and `loadSampleDataset()`, which validates each file and throws with the file name and first error if any sample file is invalid (a build-time bug, never user data) |
| src/data/sample/skills-2025-Q4.csv, skills-2026-Q1.csv, skills-2026-Q2.csv, skills-2026-Q3.csv | new: generated sample quarter files (about 300 fictional people, each rating 20 to 40 of the 40 skills, so unrated skills exist for S3) |
| src/data/sample/targets.csv | new: generated target file: each team has targets for 10 to 16 skills, so some team/skill pairs have no target (OQ-8) |
| scripts/generate-sample-data.mjs | new: deterministic generator (seeded mulberry32 PRNG, fixed seed): exports `generateSampleData()` returning file name → CSV text, and its main writes them to `src/data/sample/`. Names are combined from short lists of invented first and last names (no commas); employee ids `E0001`…; per quarter about 4% leave, 4% join and 3% change team, levels drift by at most 1; roles from a fixed list. Reads the reference JSON so data and lists cannot drift apart |
| tests/unit/csv.test.ts | new: parser tests (AC-1 support, EC tests for quoting, line endings, BOM, unclosed quote) |
| tests/unit/validate.test.ts | new: AC-1, AC-2 and validation edge-case tests |
| tests/unit/sample-data.test.ts | new: AC-3 tests and generator determinism |
| tests/unit/loader-performance.test.ts | new: AC-4 benchmark |
| tests/unit/fixtures/csv/valid-quarter.csv | new: small valid quarter file (3 people, 2026-Q3) with a quoted field containing a comma, a CRLF line ending, non-ASCII names (`Zoë Ñúñez`, an Arabic name, a name with an emoji), a trailing comma on the header only and a trailing `,,,,,,,,` separator-only row at the end (EC-1, EC-4, EC-6) |
| tests/unit/fixtures/csv/bad-quarter.csv | new: one bad row per REQ-2 reason (missing column via a separate fixture, bad level, unknown skill, unknown team, unknown category, mixed quarters, missing value, duplicate, employee details mismatch) plus good rows |
| tests/unit/fixtures/csv/missing-column.csv | new: header without `category`, with otherwise good rows and one bad level row |
| tests/unit/fixtures/csv/missing-employee-id.csv, missing-skill.csv | new: headers without `employee_id` / without `skill`, with several rows for the same person and skill, so the dependent checks must be skipped rather than report false duplicates (EC-3) |

## Tests
| AC | Acceptance criterion | Test |
|---|---|---|
| AC-1 | A valid file produces ratings for one quarter (REQ-1). | tests/unit/validate.test.ts › "S2 AC-1: a valid file produces ratings for one quarter" (valid-quarter.csv gives `ok: true`, `quarter: '2026-Q3'`, one `Rating` per data row with trimmed values, numeric `level`, the quoted comma intact, and every rating's `quarter` equal to it; columns in a different order give the same ratings) |
| AC-2 | Each error reason in REQ-2 is reported with its row number, every bad row is listed, and nothing is loaded. | tests/unit/validate.test.ts › "S2 AC-2: every bad row is listed with row number and reason and nothing is loaded" (bad-quarter.csv and missing-column.csv give `ok: false`, no `ratings` or `quarter` key, and exactly the expected `{ row, column, reason }` list, one per reason: missing column (row 1), unknown skill, unknown team, unknown category, level not a whole number 1–5 (`0`, `6`, `3.5`, `four`), mixed quarters, missing required value; plus duplicate and employee-details mismatch (OQ-7); `badRowCount` counts distinct rows; no reason contains the row's name) |
| AC-3 | Sample data has 4 consecutive quarters, ~300 people, 12 teams, 40 skills, 5 categories, and passes validation (REQ-3). | tests/unit/sample-data.test.ts › "S2 AC-3: sample data has 4 consecutive quarters of about 300 people, 12 teams, 40 skills and 5 categories and passes validation" (`loadSampleDataset()` does not throw; 4 quarters, each the `previousQuarter` of the next; each quarter has 280–320 distinct employees, all 12 teams, all 40 skills, all 5 categories; reference lists have exactly 12 teams, 40 skills, 5 categories with 8 skills each; targets.csv validates and covers all 12 teams) |
| AC-4 | Parsing and validating a 12,000-row file takes under 300 ms in a unit benchmark. | tests/unit/loader-performance.test.ts › "S2 AC-4: parsing and validating a 12,000-row file takes under 300 ms" (builds a valid 12,000-row file, 300 people × 40 skills, in the test; one warm-up run, then the median of 5 timed `validateQuarterFile` runs with `performance.now()` is under 300 ms and the result is `ok` with 12,000 ratings) |

## Edge cases
- Empty file, or only whitespace: `ok: false`, one error `{ row: 1, column: null, reason: 'The file is empty' }` (tests/unit/validate.test.ts › "S2 EC: empty and header-only files are rejected").
- Header only, no data rows: `ok: false`, `{ row: 1, column: null, reason: 'The file has no data rows' }` (same test).
- Exactly one data row: valid, one rating (covered by "S2 AC-1: ..." fixture variants in "S2 EC: a single-row file loads").
- Missing column: one error per missing column on row 1; data rows are still checked for the columns that exist, so the list shows every problem at once as in the mockup (missing-column.csv in "S2 AC-2: ..."). Checks that need a missing column are skipped: no duplicate check without `employee_id` or `skill`, no employee-details check without `employee_id`, no category-matches-skill check without `skill` or `category` ("S2 EC-3: ...").
- Separator-only rows (`,,,,,,,,` from Excel): a record whose fields are all empty after trimming is treated as blank, skipped with its number kept ("S2 EC-1: ...").
- Trailing empty header cells (header `a,b,...,quarter,`): ignored when counting expected values; trailing empty cells on a data row beyond the expected count are also ignored, so either side may have the trailing comma ("S2 EC-6: ...").
- Employee id: must match `^[A-Za-z0-9_-]{1,32}$` (S8 routes on it), else `Employee ID may only contain letters, digits, - and _ (up to 32 characters)`, value not echoed ("S2 EC-2: ...").
- Non-ASCII values (accents, RTL, emoji) survive parse and trim unchanged; the 200-character limit counts code points, so 200 is accepted and 201 rejected even with emoji ("S2 EC-4: ...").
- Team, skill and category values match the lists exactly after trimming (case-sensitive, inner spaces not collapsed): `data`, `Data  Engineering` are unknown values with the usual reason ("S2 EC-5: ...").
- Extra or duplicated header columns: extra columns are ignored; a column named twice is an error on row 1 `Duplicate column: level` ("S2 EC: header with extra, duplicate or differently cased columns").
- Header names with spaces, a BOM or different case (`Employee_ID `): trimmed, BOM stripped and matched case-insensitively (same test).
- Row with too few or too many values: one error `Row has 7 values, expected 8`, column `null`; no other checks on that row ("S2 EC: rows with the wrong number of values").
- Values with surrounding spaces: trimmed before checking and in the ratings; a value of only spaces is a missing value ("S2 AC-1: ..." and "S2 AC-2: ...").
- Level boundaries: `1` and `5` accepted; `0`, `6`, `3.5`, `04`, `4.0`, `-1`, `four` rejected with the level message, the found value truncated to 20 characters ("S2 EC: level boundaries").
- Quarter format: `2026-q3`, `2026-Q5`, `26-Q3` rejected with `Quarter must look like 2026-Q3`; the file's quarter is the first data row with a valid quarter, and any other valid quarter is a mixed-quarters error naming both ("S2 AC-2: ..." and "S2 EC: quarter format").
- Category that exists but is not the skill's category in the list: error `Category does not match the skills list (Kubernetes is Cloud)`; names the skill, never the person ("S2 EC: category must match the skill's category").
- Duplicate (same employee and skill): every repeat after the first is an error pointing to the first row; the first row itself is not marked ("S2 AC-2: ..."). Only rows whose `employee_id` and `skill` are both present and valid take part ("S2 BUG-1: ...").
- Same employee with a different name, team or role on another row (OQ-7): error on the later row per differing column, `Employee details differ from row 2 (team)`, no names ("S2 AC-2: ..."). Only rows with a valid `employee_id` take part; each compared column is remembered from the first row where it was valid, and a later row is compared only on its valid values, so an unknown team on the first row does not flag every later row ("S2 BUG-1: ...").
- Several problems on one row: each listed, `badRowCount` counts the row once ("S2 AC-2: ...").
- Hostile values: a field longer than 200 characters is rejected (`Value is longer than 200 characters`); `__proto__`, `constructor` or `toString` as team, skill or employee id are unknown or ordinary values because lookups use `Map`/`Set`; `<script>` or `=HYPERLINK(...)` in a name is kept as plain text (React escapes it on screen, S4 escapes formula characters on export) ("S2 EC: hostile values are rejected or kept as plain text").
- CSV syntax: quoted commas, `""` escapes, line breaks inside quotes (row numbers count records, not lines), CRLF, LF, lone CR, missing final newline, blank lines (skipped, numbers kept), BOM (tests/unit/csv.test.ts › "S2 EC: parser handles RFC 4180 quoting and line endings").
- Unclosed quote or a character after a closing quote: the whole file is rejected with one error on the row where it happens, nothing loaded (tests/unit/csv.test.ts › "S2 EC: malformed quoting rejects the file with the row number").
- A 12,000-row file where every row is bad: still returns the full list without throwing, within the same 300 ms budget (tests/unit/loader-performance.test.ts › "S2 EC: a 12,000-row file of bad rows is reported in under 300 ms").
- Target file: missing column, unknown team or skill, `target_level` not 1–5, missing value, duplicate team and skill, empty file: same error shape and rules (tests/unit/validate.test.ts › "S2 EC: target file validation"); a team without a target for a skill is allowed (OQ-8).
- Repeated validation of the same text gives the same result (pure functions, no module state); the validator never mutates `ref` ("S2 EC: validation is pure and repeatable").
- Sample data drifting from its generator or from the reference lists: tests/unit/sample-data.test.ts › "S2 EC: sample files equal the generator output" regenerates in memory and compares with the committed files byte for byte.
- Sample names being real people: names are invented combinations; the test asserts every name is built from the generator's lists, and no file contains an `@` or a phone-like number ("S2 EC: sample data is fictional").
- File size and reading the file (5 MB limit, `FileReader`, encoding): S4's load flow; S2 takes text. Not handled here deliberately.
- State from earlier stories: S1 left only the placeholder app and the test harness; nothing calls the data layer yet, so nothing existing can break. `tsconfig.json` already includes `src` and `vite/client` types (for `?raw` imports); JSON is imported with `resolveJsonModule` added if `tsc --noEmit` requires it.

## Review findings
| ID | Finding | Handling | Test |
|---|---|---|---|
| EC-1 | Separator-only rows (`,,,,,,,`) get 8 missing-value errors and reject a valid file | Validator treats a record whose fields are all empty after trimming as blank: skipped, row number kept, not counted in `rowCount`; valid-quarter.csv ends with such a row | tests/unit/validate.test.ts › "S2 EC-1: separator-only rows are skipped like blank lines" |
| EC-2 | employee_id with `/`, `#`, `?` or spaces loads and later breaks `#/person/:employeeId` routing | `employee_id` must match `EMPLOYEE_ID_RE` `^[A-Za-z0-9_-]{1,32}$`, else `Employee ID may only contain letters, digits, - and _ (up to 32 characters)` on column `employee_id`; value not echoed | tests/unit/validate.test.ts › "S2 EC-2: employee ids with URL-unsafe characters are rejected" |
| EC-3 | Missing `employee_id` or `skill` column makes dependent checks report false duplicates or throw | Dependent checks skipped when a column they need is missing (duplicate: `employee_id` and `skill`; details: `employee_id`; category match: `skill` and `category`); only the row 1 missing-column error plus per-column errors for present columns | tests/unit/validate.test.ts › "S2 EC-3: dependent checks are skipped when employee_id or skill is missing" |
| EC-4 | Non-ASCII names untested; `.length` counts UTF-16 units so emoji names hit the 200 limit early | valid-quarter.csv has accented, Arabic and emoji names, asserted unchanged in the ratings; length counted with `[...value].length`; 200 code points (with emoji) accepted, 201 rejected | tests/unit/validate.test.ts › "S2 EC-4: non-ASCII values survive and the 200-character limit counts code points" |
| EC-5 | Case or spacing differences in team/skill values are unspecified | Exact, case-sensitive match after trimming; inner spaces not collapsed; `data`, `kubernetes ` (trims to `kubernetes`) and `Data  Engineering` are unknown values | tests/unit/validate.test.ts › "S2 EC-5: team, skill and category values match the lists exactly after trimming" |
| EC-6 | Trailing comma on header but not rows (or vice versa) fails every row on value count | Trailing empty header cells are dropped before counting expected values; trailing empty cells beyond the expected count on a data row are ignored; non-empty extra cells still give `Row has N values, expected M` | tests/unit/validate.test.ts › "S2 EC-6: a trailing comma on the header or the rows is tolerated" |
| BUG-1 | Duplicate and details checks run on rows with missing or invalid keys: two rows without employee_id are flagged as duplicates; a bad team on the first row flags every later row | Duplicate check only when `employee_id` and `skill` are present and valid; details check only with a valid `employee_id`, remembering each column from the first row where it was valid and comparing only valid values | tests/unit/validate.test.ts › "S2 BUG-1: rows with missing or invalid keys are not reported as duplicates or detail mismatches" |

## Steps
1. Write the fixtures and failing tests: tests/unit/csv.test.ts, validate.test.ts, sample-data.test.ts, loader-performance.test.ts. Run each with `npm run test:file -- <file>` and confirm they fail because `src/data/*` does not exist.
2. Implement `src/data/types.ts`, `quarter.ts` and `csv.ts`; make csv.test.ts green.
3. Add the reference JSON and `reference.ts`. Implement `validateQuarterFile`: parse; skip records whose fields are all empty after trimming (EC-1); empty / header-only checks; drop trailing empty header cells (EC-6), map header names (trim, lowercase, BOM already stripped), report missing and duplicate columns on row 1; for each data record: drop trailing empty cells beyond the expected count (EC-6), then field count, then per column trimmed value: missing value, length > 200 in code points (EC-4), `employee_id` against `EMPLOYEE_ID_RE` (EC-2), team in `ref.teams`, skill in `ref.skills`, category in `ref.categories` (all exact, case-sensitive, EC-5) and equal to the skill's category when both columns exist (EC-3), level `^[1-5]$`, quarter format then equal to the file quarter; duplicate `employeeId + skill` via a `Map` to the first row, only when both columns exist and both values are valid (EC-3, BUG-1); employee name/team/role per id, remembered per column from the first row where that value was valid and compared only on valid values, only when `employee_id` exists and is valid (EC-3, BUG-1). Collect errors; if none, return the ratings.
4. Implement `validateTargetFile` with the same helpers (columns `team`, `skill`, `target_level`; duplicate `team + skill`). Make validate.test.ts green.
5. Write `scripts/generate-sample-data.mjs`, run it to create `src/data/sample/*.csv`, add `src/data/sample.ts`; make sample-data.test.ts green.
6. Run loader-performance.test.ts; if over budget, remove per-row allocations (single pass, no regex per field beyond the level and quarter checks).
7. Full suite (`npm test && npm run test:e2e`), `npm run build` (checks types and that `?raw` and JSON imports bundle), `validate_plan.py --check-tests`, preflight; then the verifier and the build report.

## Risks and rollback
- Pure additions under `src/data/`, `scripts/` and `tests/unit/`; nothing calls them yet. Rollback is reverting the PR.
- The 300 ms benchmark can be flaky on a busy CI runner; the median of 5 runs after a warm-up reduces noise. If it still flakes, the spec's "Performance in CI" decision applies.
- The bundled sample files (about 9,000 rows a quarter, roughly 2.5 MB of CSV text before gzip) make the JS bundle large; acceptable for a local prototype, and S8's 1 s budget will show if it is not.
- Decision to confirm (OQ-6): the 12 team names and 40 skill names are invented for the prototype and ship as JSON with the sample data; the owner names who maintains the real lists.
- Decision to confirm (OQ-7): a duplicate row (same employee and skill) and an employee whose name, team or role differs between rows of one file are both errors listed per row.
- Decision to confirm (OQ-8): the target file needs `team`, `skill`, `target_level` (whole number 1–5), known team and skill, no duplicate team and skill; a team may lack targets for some skills.
- Decision to confirm: a category that exists but differs from the skill's category in the skills list is an error (REQ-2 lists "unknown category"; a mismatch is treated the same way).
- Decision to confirm: header names are matched after trimming and case-insensitively, and extra columns are ignored rather than rejected.
- Decision to confirm (EC-5): team, skill and category values match the lists exactly after trimming (case-sensitive); a differently cased value is an unknown value, not silently corrected.
- Decision to confirm (EC-2): employee ids are limited to letters, digits, `-` and `_`, up to 32 characters, so they are safe in S8's `#/person/:employeeId` route.
- Decision to confirm: the file's quarter is taken from the first data row with a valid quarter; rows with another quarter are the mixed-quarters errors.
- Decision to confirm: the sample quarters are 2025-Q4 to 2026-Q3 (the design shows 2026-Q3 as latest and compares with 2026-Q2).

## Out of scope
- The load-file flow, 5 MB size check, `FileReader`, the error modal and its "Download problem list (CSV)" button, and adding or replacing a quarter in the app state (S4).
- The CSV writer and formula-injection escaping for exports (S4).
- Metrics and the per-quarter indexes (S3, S4).
- Any screen or UI change.
