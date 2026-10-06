# S2 test cases and status

Every test S2 added, with its status in each flow that ran it.

- **Build**: the build job's runs and the verifier, before story PR #17 opened.
- **PR**: `pr / e2e` and `pr / traceability` on story PR #17.
- **Main**: `tests / e2e` on `main` after the merge (`2d0bb76`).

CI logs report counts, not test names: each run reported all tests passing with
none skipped (unit 34/34, e2e 15/15), and the counts match S1's 8 unit tests
plus the 26 listed here, and S1's 5 e2e tests in 3 browsers.

## Acceptance criteria

| ID | Test | File | Type | Build | PR | Main |
|---|---|---|---|---|---|---|
| AC-1 | S2 AC-1: a valid file produces ratings for one quarter | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| AC-2 | S2 AC-2: every bad row is listed with row number and reason and nothing is loaded | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| AC-3 | S2 AC-3: sample data has 4 consecutive quarters of about 300 people, 12 teams, 40 skills and 5 categories and passes validation | tests/unit/sample-data.test.ts | unit | ✅ | ✅ | ✅ |
| AC-4 | S2 AC-4: parsing and validating a 12,000-row file takes under 300 ms | tests/unit/loader-performance.test.ts | unit (benchmark) | ✅ | ✅ | ✅ |

## Review findings (must fix, from the plan review)

| ID | Test | File | Type | Build | PR | Main |
|---|---|---|---|---|---|---|
| EC-1 | S2 EC-1: separator-only rows are skipped like blank lines | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| EC-2 | S2 EC-2: employee ids with URL-unsafe characters are rejected | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| EC-3 | S2 EC-3: dependent checks are skipped when employee_id or skill is missing | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| EC-4 | S2 EC-4: non-ASCII values survive and the 200-character limit counts code points | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| EC-5 | S2 EC-5: team, skill and category values match the lists exactly after trimming | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| EC-6 | S2 EC-6: a trailing comma on the header or the rows is tolerated | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| BUG-1 | S2 BUG-1: rows with missing or invalid keys are not reported as duplicates or detail mismatches | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |

## Plan edge cases

| Test | File | Type | Build | PR | Main |
|---|---|---|---|---|---|
| S2 EC: parser handles RFC 4180 quoting and line endings | tests/unit/csv.test.ts | unit | ✅ | ✅ | ✅ |
| S2 EC: malformed quoting rejects the file with the row number | tests/unit/csv.test.ts | unit | ✅ | ✅ | ✅ |
| S2 EC: a 12,000-row file of bad rows is reported in under 300 ms | tests/unit/loader-performance.test.ts | unit (benchmark) | ✅ | ✅ | ✅ |
| S2 EC: sample files equal the generator output | tests/unit/sample-data.test.ts | unit | ✅ | ✅ | ✅ |
| S2 EC: sample data is fictional | tests/unit/sample-data.test.ts | unit | ✅ | ✅ | ✅ |
| S2 EC: empty and header-only files are rejected | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| S2 EC: a single-row file loads | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| S2 EC: header with extra, duplicate or differently cased columns | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| S2 EC: rows with the wrong number of values | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| S2 EC: level boundaries | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| S2 EC: quarter format | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| S2 EC: category must match the skill's category | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| S2 EC: hostile values are rejected or kept as plain text | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| S2 EC: target file validation | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |
| S2 EC: validation is pure and repeatable | tests/unit/validate.test.ts | unit | ✅ | ✅ | ✅ |

## Regression: S1 tests in S2's flows

All 13 S1 tests ([S1 test cases](../skills-dashboard-prototype-s1/test-cases.md))
passed again in Build, PR and Main: 8 unit tests, and 5 e2e tests in 3 browsers.

## Totals

| | Test cases | Build | PR | Main |
|---|---|---|---|---|
| S2 unit (Vitest) | 26 | 26/26 | 26/26 | 26/26 |
| S1 regression unit | 8 | 8/8 | 8/8 | 8/8 |
| S1 regression e2e (Playwright, ×3 browsers) | 5 (15 runs) | 15/15 | 15/15 | 15/15 |
| Traceability (`validate_plan.py --check-tests`) | 11 IDs (AC-1–4, EC-1–6, BUG-1) | OK | OK | — |
