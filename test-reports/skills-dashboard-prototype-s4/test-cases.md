# S4 test cases and status

Every test named for the story, with its status in each flow that ran it:

- **Build**: the build's own runs and the verifier, before the story PR opened
- **PR**: the PR's test check after the review gate
- **Main**: the tests on the base branch after the merge

CI logs give counts, not names: a passing suite marks each of its tests passing (see the runner summaries in [README.md](README.md)).

## Acceptance criteria

| ID | Test | File | Build | PR | Main |
|---|---|---|---|---|---|
| AC-1 | S4 AC-1: quarter selector defaults to the latest loaded quarter | tests/unit/shell.test.tsx | ✅ | ✅ | ✅ |
| AC-2 | S4 AC-2: applied filters are shown and Clear all removes them in one action | tests/e2e/shell.spec.ts | ✅ | ✅ | ✅ |
| AC-3 | S4 AC-3: downloaded CSV matches the visible rows, columns and sort and escapes formula-leading characters | tests/unit/DataTable.test.tsx | ✅ | ✅ | ✅ |
| AC-4 | S4 AC-4: a bad file shows every bad row, leaves the data unchanged and storage empty | tests/e2e/shell.spec.ts | ✅ | ✅ | ✅ |
| AC-5 | S4 AC-5: all controls work by keyboard and axe-core reports no violations | tests/e2e/shell.spec.ts | ✅ | ✅ | ✅ |

## Review findings (must fix)

| ID | Test | File | Build | PR | Main |
|---|---|---|---|---|---|
| EC-1 | S4 EC-1: Windows-1252 and UTF-16 files are refused with a CSV UTF-8 message and nothing is loaded | tests/unit/load-file.test.tsx | ✅ | ✅ | ✅ |
| EC-2 | S4 EC-2: focus returns to the load button after the error dialog closes, also on a second bad load | tests/unit/load-file.test.tsx | ✅ | ✅ | ✅ |
| EC-3 | S4 EC-3: empty, header-only, unclosed-quote and missing-column files use the file-level dialog and one bad row reads 1 row has problems | tests/unit/load-file.test.tsx | ✅ | ✅ | ✅ |
| EC-4 | S4 EC-4: hrefFor and the hash parser round-trip values with & = + % # / comma emoji and 200 characters | tests/unit/router.test.ts | ✅ | ✅ | ✅ |
| EC-5 | S4 EC-5: a 5 MB file with every cell bad opens the dialog at once and eventually lists every bad row | tests/unit/load-file.test.tsx | ✅ | ✅ | ✅ |
| EC-6 | S4 EC-6: many long filter chips wrap without horizontal scroll at 1024 px and stay clickable | tests/e2e/shell.spec.ts | ✅ | ✅ | ✅ |
| EC-7 | S4 EC-7: a file that cannot be read shows a dialog and re-enables the buttons | tests/unit/load-file.test.tsx | ✅ | ✅ | ✅ |
| EC-8 | S4 EC-8: loading the same file twice replaces the status text node each time | tests/unit/load-file.test.tsx | ✅ | ✅ | ✅ |
| BUG-1 | S4 BUG-1: a duplicated formula-leading header gives a problem-list CSV whose Column and Reason cells start with ' | tests/unit/load-file.test.tsx | ✅ | ✅ | ✅ |

## Other tests

| ID | Test | File | Build | PR | Main |
|---|---|---|---|---|---|
| — | S4 EC: sorting is stable, numeric and puts empty values last | tests/unit/DataTable.test.tsx | ✅ | ✅ | ✅ |
| — | S4 EC: an empty table disables Download CSV | tests/unit/DataTable.test.tsx | ✅ | ✅ | ✅ |
| — | S4 EC: download file names are sanitised | tests/unit/DataTable.test.tsx | ✅ | ✅ | ✅ |
| — | S4 EC: hostile cell values render as text | tests/unit/DataTable.test.tsx | ✅ | ✅ | ✅ |
| — | S4 EC: export quoting round-trips through the parser | tests/unit/csv-export.test.ts | ✅ | ✅ | ✅ |
| — | S4 EC: formula-leading cells are escaped in every row, including the header | tests/unit/csv-export.test.ts | ✅ | ✅ | ✅ |
| — | S4 EC: plain numbers are not escaped and null is empty | tests/unit/csv-export.test.ts | ✅ | ✅ | ✅ |
| — | S4 EC: every rating appears once in each index | tests/unit/indexes.test.ts | ✅ | ✅ | ✅ |
| — | S4 EC: __proto__ and constructor names are ordinary keys | tests/unit/indexes.test.ts | ✅ | ✅ | ✅ |
| — | S4 EC: an empty quarter gives empty indexes | tests/unit/indexes.test.ts | ✅ | ✅ | ✅ |
| — | S4 EC: the router ignores unknown filters and survives malformed hashes | tests/unit/router.test.ts | ✅ | ✅ | ✅ |
| — | S4 EC: an empty dataset shows the empty state and a disabled quarter selector | tests/unit/shell.test.tsx | ✅ | ✅ | ✅ |
| — | S4 EC: loading a loaded quarter replaces it and selects it | tests/unit/shell.test.tsx | ✅ | ✅ | ✅ |
| — | S4 EC: only .csv files are read | tests/unit/shell.test.tsx | ✅ | ✅ | ✅ |
| — | S4 EC: the 5 MB limit is checked before reading | tests/unit/shell.test.tsx | ✅ | ✅ | ✅ |
| — | S4 EC: a cancelled picker changes nothing | tests/unit/shell.test.tsx | ✅ | ✅ | ✅ |
| — | S4 EC: the same file can be loaded twice | tests/unit/shell.test.tsx | ✅ | ✅ | ✅ |
| — | S4 EC: load buttons are disabled while a file is read | tests/unit/shell.test.tsx | ✅ | ✅ | ✅ |
| — | S4 EC: a target file is validated and replaces the targets | tests/unit/shell.test.tsx | ✅ | ✅ | ✅ |
| — | S4 EC: a dialog lists all 12,000 errors of a fully bad file | tests/unit/shell.test.tsx | ✅ | ✅ | ✅ |
| — | S4 EC: hostile file names and filter values render as text | tests/unit/shell.test.tsx | ✅ | ✅ | ✅ |
| — | S4 EC: filter chips and Clear all navigate in one step | tests/unit/shell.test.tsx | ✅ | ✅ | ✅ |
| — | S4 EC: nav links mark the current screen and unknown routes show Page not found | tests/unit/shell.test.tsx | ✅ | ✅ | ✅ |
