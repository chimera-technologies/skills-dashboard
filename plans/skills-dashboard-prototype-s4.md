---
id: skills-dashboard-prototype-s4
spec: specs/skills-dashboard-prototype.md
story: S4
jira: SCRUM-17
branch: story/scrum-17-app-shell
created: 2026-10-07
---

# Plan: S4 App shell: quarter selector, filters, tables and file loading

## Story
The frame every screen lives in: the shared header (app name, the three
screen links, the quarter selector, "Load quarter file" and "Load target
file"), hash routing for the four screens, the applied-filter bar with chips
and "Clear all", the one shared table component with sortable headers and
"Download CSV", the in-memory store with per-quarter indexes, and the
load-file flow with its error dialog. Covers REQ-2 (error list in the UI),
REQ-9, REQ-10 and REQ-13 for the shell; the screens' bodies are S5 to S8.

Built on S2's `validateQuarterFile`, `validateTargetFile`, `loadSampleDataset`,
`parseCsv` and `compareQuarters`, and S3's types. Nothing in `src/` calls them
yet except tests, so the only existing UI is `App.tsx`'s placeholder.

## Design
Every screen shares the header and filter bar, so S4 must match these parts
of each screen (the screen bodies are the later stories'):
- overview: designs/skills-dashboard-prototype/screens/overview.png — header
  56 px, white, bottom border `color.border`: "Skills dashboard" (`type.h2`
  weight), nav links Overview / Team / Skill search with the current one as
  an `color.accent-soft` pill with `color.accent` text and underline bar
  (`aria-current="page"`); right side "Quarter" label, the select showing
  `2026-Q3 (latest)`, then two outlined accent buttons "Load quarter file"
  and "Load target file". Filter bar 44 px: bold "Filters:" then "No filters
  applied" in `color.muted`.
- team-view: designs/skills-dashboard-prototype/screens/team-view.png — a
  chip "Category: Engineering, Data ×" (one chip per filter key, values
  joined by ", ", `color.accent-soft` pill, `×` button) and an underlined
  "Clear all" link-style button; "Download CSV" as an underlined accent link
  at a card's top right.
- skill-search-results: designs/skills-dashboard-prototype/screens/skill-search-results.png —
  two chips "Team: Data Platform, Payments ×" and "Role: Senior engineer ×"
  plus "Clear all"; the table header with a sort arrow on the sorted column
  ("Level ▼") and a neutral "⇅" on other sortable ones; "Download CSV (9
  rows, filters applied)".
- load-file-errors: designs/skills-dashboard-prototype/screens/load-file-errors.png —
  modal over the unchanged screen with a dimmed backdrop, `color.error` top
  border and "!" icon; title "{file name} was not loaded"; text "{n} rows
  have problems. Nothing was loaded and the data on screen has not changed.
  Fix the rows in the file and load it again."; an `color.error-soft` box
  "File checked: {rows} rows · {bad} rows with problems · file kept in this
  browser only, not uploaded or saved"; "Rows with problems" table (Row,
  right-aligned with thousands separators; Column in monospace or "—";
  Reason); footer note "Messages give the row number and reason, never the
  person's name."; buttons "Download problem list (CSV)" (outlined) and
  "Close" (filled accent), focus starting on "Close".
- Tokens: `color.*` as in design.md, `color.focus #1f5fae` 3 px outline 2 px
  offset on every focusable element, `type.body`, `type.h1`, `type.h2`,
  `type.label`, `type.table`, `space.unit 8px`, `radius 6px`, header 56 px,
  filter bar 44 px, page padding 24 px; layout works from 1024 px wide.
- Not mocked, from design.md decisions: a successful load shows a short
  status message and switches to that quarter.

## Files
| File | Change |
|---|---|
| src/data/csv.ts | changed: add `toCsv(rows: (string \| number \| null)[][])`, RFC 4180 writer (quote cells with `,` `"` CR or LF, double the quotes, CRLF line ends), and `exportCell(value)`: `null` → empty; a cell starting with `=`, `+`, `-`, `@`, tab or CR is prefixed with `'`, except a plain number (`/^-?\d+(\.\d+)?$/`, e.g. `-0.1`). `toCsv` runs `exportCell` on **every** cell itself (header and data), so no caller can skip formula escaping (BUG-1); `exportCell` is not exported for callers to apply separately |
| src/data/indexes.ts | new: `QuarterIndex = { byTeam, bySkill, byPerson: Map<string, Rating[]> }` and `indexQuarter(ratings)`, one pass, `Map` only; built once per quarter on load (spec Design, REQ-11) |
| src/app/store.tsx | new: `DataProvider` + `useData()` (React context + `useReducer`): `dataset`, `indexes` (quarter → `QuarterIndex`), `sources` (quarter → "Sample data (fictional)" or the file name), `quarters` (loaded, newest first), `selectedQuarter` (latest at start-up), `status` (`{ text, id }`, `id` incremented on every set, even when the text is the same, EC-8), actions `selectQuarter`, `addQuarter(result, fileName)` (adds or replaces that quarter, rebuilds only its index, selects it), `setTargets(result, fileName)`. Start-up state from `loadSampleDataset()`; if it throws, an empty dataset plus an error status. Every update makes new `Map`s; nothing is written to storage |
| src/app/router.ts | new: `useRoute()` reading `location.hash` on `hashchange`: `{ screen: 'overview' \| 'team' \| 'skills' \| 'person' \| 'not-found', param, filters }` for `#/`, `#/team/:team?`, `#/skills`, `#/person/:employeeId`; `filters` from the hash query (`#/skills?team=A&team=B&role=X`), keeping only keys in `FILTER_LABELS` (`team` Team, `role` Role, `category` Category) and non-empty values, de-duplicated; `hrefFor(screen, param?, filters?)`; `decodeURIComponent` failures give `not-found`. Encoding (EC-4): `hrefFor` writes each key and value with `encodeURIComponent` (so `&`, `=`, `+`, `%`, `#`, `/`, `,`, spaces and emoji are all escaped; spaces as `%20`, never `+`); the parser splits the query on `&` and then on the first `=` **before** decoding each part with `decodeURIComponent`, and never treats `+` as a space. `parse(hrefFor(f))` equals `f` for any values |
| src/app/Header.tsx | new: app name (`h1`), nav links with `aria-current`, labelled quarter `<select>` (options newest first, the newest labelled "(latest)"; disabled with "No data" when nothing is loaded), and the two load buttons from `LoadFile` |
| src/app/FilterBar.tsx | new: "Filters:" then "No filters applied" or one chip per filter key ("Team: Data Platform, Payments") with a remove button (`aria-label="Remove filter Team: Data Platform, Payments"`) and "Clear all", each one navigation to the same route with that key, or every key, removed. Each value inside a chip is its own `<span class="chip-value">` (values separated by a visible ", " that is not part of the value), so "Engineer, senior" stays one value; the remove button's `aria-label` quotes each value (`Remove filter Role: "Engineer, senior"`) (EC-4) |
| src/app/LoadFile.tsx | new: "Load quarter file" / "Load target file" buttons, each opening its own hidden `<input type="file" accept=".csv,text/csv">`; checks name ends in `.csv` (any case) and `size <= MAX_FILE_BYTES` (5 × 1024 × 1024) before reading; then `readCsvFile(file)` and S2's validators; success → store action and status message; failure → `LoadErrorsDialog`. The whole read + validate is in `try/catch/finally` (EC-7): a rejected read (`NotReadableError`, `NotFoundError`, anything) gives the file-level dialog "The file could not be read. Check it still exists and try again."; `finally` always re-enables both buttons and resets the input's value. Order (EC-2): the opening button is stored in a ref before the picker opens; the buttons are re-enabled (busy state cleared) in the same state update that sets the dialog's content, and the dialog calls `showModal()` in an effect after that render, when the buttons are enabled again; on the dialog's `close` event the stored button gets `.focus()` explicitly (no reliance on native focus restore). No `console` calls |
| src/app/readFile.ts | new (EC-1): `readCsvFile(file): Promise<{ ok: true, text } \| { ok: false, reason }>`: `file.arrayBuffer()`, a UTF-16 BOM (`FF FE` or `FE FF`) → not ok; a UTF-8 BOM is stripped; decode with `new TextDecoder('utf-8', { fatal: true })`, a decode error → not ok. Reason for both: "The file must be saved as CSV UTF-8 (in Excel: Save As › CSV UTF-8). It was not loaded." Read rejections propagate to `LoadFile`'s catch (EC-7) |
| src/app/LoadErrorsDialog.tsx | new: native `<dialog>` opened with `showModal()` (focus trap, Esc, backdrop), `aria-labelledby` the title; two variants chosen by `summariseErrors(result)` (EC-3): **file-level** when `rowCount === 0` (empty file, header only, unclosed quote: S2 reports these on row 1 with `column: null`), when there is no bad *data* row (only header problems such as missing or duplicate columns: errors on the header row, i.e. reasons starting `Missing column` / `Duplicate column`), and for wrong type, too large, unreadable and not UTF-8: title "{file name} was not loaded", the reason(s) as a list, no counts and no row table. **Row problems** otherwise: counts exclude the header row, singular/plural ("1 row has problems" / "{n} rows have problems"; "File checked: 1 row · 1 row with problems"), header problems (if any) listed above the table under "Problems with the columns", then the "Rows with problems" table: one table row per bad row in file order (row with `toLocaleString('en')`; each of that row's problems on its own line in the Column cell (or "—") and Reason cell). Large lists (EC-5): the first 500 bad rows render with the dialog, the rest are appended in chunks of 2,000 per animation frame until every bad row is listed (AC-4 "every bad row" kept); a "Listing {shown} of {total} rows…" line is shown while chunks are added. "Download problem list (CSV)" (Row, Column, Reason, one line per error, through `toCsv` so every cell is formula-escaped, BUG-1) and "Close"; focus starts on "Close" and returns to the opening load button (EC-2) |
| src/app/DataTable.tsx | new: the shared table: props `caption`, `columns` (`key`, `header`, `value(row)` → string, number or null, optional `render(row)`, `sortable`, `align`), `rows`, `initialSort`, `fileName`; sortable headers are buttons inside `th` with `aria-sort`; sort is stable, numbers numeric, strings `localeCompare`, `null` last in both directions; "Download CSV ({n} rows)" exports exactly the shown columns' `value`s in the shown order through `toCsv`, disabled as "Download CSV (no rows)" when empty |
| src/app/download.ts | new: `downloadCsv(fileName, rows)`: UTF-8 BOM + `toCsv`, `Blob`, object URL, temporary `<a download>`, click, revoke after 1 s; file name characters outside `[A-Za-z0-9._-]` replaced by `-` |
| src/screens/Overview.tsx | new placeholder: "Organisation overview" (`h2`) with the selected quarter and its source; S5 replaces the body |
| src/screens/Placeholder.tsx | new: title (`h2`) and the selected quarter for Team, Skill search and Person until S6 to S8; "Page not found" with a link to the overview for `not-found` |
| src/App.tsx | changed: `DataProvider`, `Header`, `FilterBar`, status region (`role="status"`, always mounted; its text is a child `<span key={status.id}>`, so a repeated message is a new node and is announced again, EC-8), and the screen for the route; keeps the `h1` "Skills dashboard" (S1 tests) and "Load a skills file to get started." when no quarter is loaded |
| src/index.css | changed: the design tokens as CSS custom properties; header, nav, select, buttons, filter bar and chips, table and sort buttons, dialog and backdrop, `:focus-visible` ring; page padding 24 px; no layout overflow at 1024 px. Filter bar (EC-6): `min-height: 44px` (not a fixed height) with `flex-wrap: wrap` and a row gap, so many chips wrap onto more lines; chip text wraps (`overflow-wrap: anywhere`, `max-width: 100%`), so a 200-character value never overflows; remove buttons and "Clear all" stay whole and clickable |
| tests/unit/csv-export.test.ts | new: `toCsv` quoting, CRLF, formula escaping of every cell including the header, numbers left alone, round trip through `parseCsv` |
| tests/unit/router.test.ts | new: EC-4 round trip of `hrefFor` and the parser with hostile values |
| tests/unit/load-file.test.tsx | new: EC-1, EC-2, EC-3, EC-5, EC-7, EC-8, BUG-1: load flow with `File` objects built from bytes (Windows-1252, UTF-16), a `File` whose `arrayBuffer()` rejects, dialog variants and counts, focus after close, status re-announcement, problem-list CSV; stubs `showModal`/`close` (the `close` stub dispatches a `close` event) and `URL.createObjectURL` |
| tests/unit/DataTable.test.tsx | new: AC-3 and table edge cases (sorting, empty table, hostile cells); stubs `URL.createObjectURL` and reads the `Blob` text |
| tests/unit/indexes.test.ts | new: every rating appears once in each index; `__proto__` names; empty quarter |
| tests/unit/shell.test.tsx | new: AC-1, router and filter parsing, load-flow edge cases with `File` objects; stubs `HTMLDialogElement.prototype.showModal`/`close` where jsdom lacks them |
| tests/e2e/shell.spec.ts | new: AC-2, AC-4, AC-5 in Chromium, Firefox and WebKit at 1024 px, with axe-core and the S1 origin guard |
| tests/e2e/fixtures/skills-2026-Q4.csv | new: small valid fictional quarter file (reference teams and skills) |
| tests/e2e/fixtures/bad-skills-2026-Q4.csv | new: fictional file with valid rows and six bad rows like the mockup's (level `3.5`, unknown skill, unknown team, mixed quarter, missing `employee_id`, duplicate row), so the expected error list is known exactly |
No change to S2 or S3 behaviour: `csv.ts` only gains the writer.

## Tests
| AC | Acceptance criterion | Test |
|---|---|---|
| AC-1 | The quarter selector defaults to the latest loaded quarter. | tests/unit/shell.test.tsx › "S4 AC-1: quarter selector defaults to the latest loaded quarter" (sample data → `2026-Q3 (latest)` selected and options newest first; after loading an older 2025-Q3 file the "(latest)" label stays on 2026-Q3; after loading 2026-Q4 it moves there; the e2e AC-5 walk also asserts the default in all three engines) |
| AC-2 | Applied filters are shown and "Clear all" removes them in one action. | tests/e2e/shell.spec.ts › "S4 AC-2: applied filters are shown and Clear all removes them in one action" (open `#/skills?team=Data%20Platform&team=Payments&role=Senior%20engineer`: chips "Team: Data Platform, Payments" and "Role: Senior engineer"; one click on "Clear all" → "No filters applied", hash `#/skills`, one history entry added; removing one chip keeps the other) |
| AC-3 | Downloaded CSV matches the visible rows, columns and sort, and escapes formula-leading characters. | tests/unit/DataTable.test.tsx › "S4 AC-3: downloaded CSV matches the visible rows, columns and sort and escapes formula-leading characters" (rows with names `=SUM(A1)`, `+1`, `-cmd`, `@x`, `a,b`, `say "hi"`, a level `null`, a change `-0.1`; sort by a column, click "Download CSV", parse the blob with `parseCsv`: header equals the visible headers, rows equal the visible cell text in the same order, hostile cells start with `'`, `-0.1` stays a number) |
| AC-4 | Loading a bad file shows every bad row and leaves the data unchanged; storage stays empty (REQ-13). | tests/e2e/shell.spec.ts › "S4 AC-4: a bad file shows every bad row, leaves the data unchanged and storage empty" (load `bad-skills-2026-Q4.csv`: dialog lists exactly the fixture's bad rows with row, column and reason; no employee name in the dialog; after Close the quarter options and selection are unchanged and there is no 2026-Q4; `localStorage`, `sessionStorage`, `indexedDB.databases()`, `caches.keys()` and `document.cookie` are empty; no request at all, to any origin, from picking the file to closing the dialog; the origin guard finds none) |
| AC-5 | All controls work by keyboard; axe-core reports no violations. | tests/e2e/shell.spec.ts › "S4 AC-5: all controls work by keyboard and axe-core reports no violations" (Tab order reaches the nav links, quarter select, both load buttons, chip remove buttons and Clear all with a visible focus outline; Enter on a nav link changes route; arrow keys change the quarter; Enter on a load button opens the file chooser; the error dialog opens with focus on Close, Tab stays inside it, Esc closes it and focus returns to the load button; axe-core with no violations on `#/`, `#/team`, `#/skills` with chips, `#/person/E0001`, the not-found route and with the error dialog open) |

## Edge cases
- No quarter loaded (sample data fails to load, an empty dataset): the select is disabled and reads "No data", screens show "Load a skills file to get started.", the status says the sample data could not be loaded; nothing throws ("S4 EC: an empty dataset shows the empty state and a disabled quarter selector").
- One quarter loaded: it is selected and labelled "(latest)"; change-based screens handle the missing previous quarter (S3) ("S4 AC-1: ...").
- Loading a quarter that is already loaded: it replaces that quarter only, its index is rebuilt, other quarters keep theirs, it becomes selected and the status says "Replaced" ("S4 EC: loading a loaded quarter replaces it and selects it").
- Loading an older quarter: it is added and selected (design.md decision); "(latest)" stays on the newest ("S4 AC-1: ...").
- File type: `skills.xlsx`, `skills.csv.exe`, no extension → file-level dialog "Only .csv files can be loaded", not read; `SKILLS.CSV` is accepted ("S4 EC: only .csv files are read").
- Size: 0 bytes → read and reported by S2 as "The file is empty", in the file-level dialog (EC-3); exactly 5 MB is read; 5 MB + 1 byte → "The file is larger than 5 MB", not read ("S4 EC: the 5 MB limit is checked before reading").
- Cancelled picker (no file) or several files: nothing happens / only the first is used ("S4 EC: a cancelled picker changes nothing").
- Same file picked twice: the input value is reset, so the second pick is processed again ("S4 EC: the same file can be loaded twice").
- Repeated clicks while a file is read: both load buttons are disabled until the result is applied, so two loads cannot interleave; they are re-enabled on every path, including a failed read or a validator that throws (EC-7), and before the dialog opens so focus can return to them (EC-2) ("S4 EC: load buttons are disabled while a file is read").
- Encoding (EC-1): only UTF-8 (with or without BOM) is accepted; Windows-1252 bytes or a UTF-16 file give the file-level "must be saved as CSV UTF-8" dialog, never damaged names ("S4 EC-1: ...").
- The same message twice (EC-8): every status set gets a new `id`, so the live region announces it again ("S4 EC-8: ...").
- Target file: bad target file shows the same dialog and keeps the old targets; a good one replaces all targets and the status says how many ("S4 EC: a target file is validated and replaces the targets").
- Many errors (every row of a 12,000-row file bad): every bad row is listed, as AC-4 requires, and the test checks the last bad row is present ("S4 EC: a dialog lists all 12,000 errors of a fully bad file"). The worst case the 5 MB limit allows (about 60,000 short rows with every cell bad) is EC-5: one table row per bad row, rendered in chunks so the dialog opens at once ("S4 EC-5: ...").
- Hostile content: file names, team names, filter values and cell values are rendered as React text only (no `dangerouslySetInnerHTML`); a file name like `<img src=x onerror=alert(1)>.csv` shows as text; long file names wrap ("S4 EC: hostile file names and filter values render as text").
- Error messages never include a person's name (SEC-2.3): the dialog shows only S2's row, column and reason ("S4 AC-4: ..." asserts no fixture name appears).
- Filter URL: unknown keys (`?foo=1`, `?__proto__=x`), empty values and duplicates are ignored; values are decoded once; a malformed `%E0` in the hash goes to "Page not found" instead of throwing; `#/person/` with no id is not found ("S4 EC: the router ignores unknown filters and survives malformed hashes").
- Clear all with no filters: the button is not shown; removing the last chip shows "No filters applied" ("S4 AC-2: ...").
- CSV export: header row always exported; empty table exports nothing (button disabled "(no rows)"); cells with commas, quotes and line breaks are quoted; `null` is empty; formula-leading cells including tab and CR get `'`; plain negative numbers do not; non-ASCII names survive (UTF-8 BOM) ("S4 AC-3: ..." and "S4 EC: export quoting round-trips through the parser").
- Sorting: ties keep input order; `null` sorts last in both directions; numbers sort numerically (10 after 9) ("S4 EC: sorting is stable, numeric and puts empty values last").
- Download file name from data (`team` names): unsafe characters replaced ("S4 EC: download file names are sanitised").
- Storage and network (REQ-13): nothing is stored, no request is made for a load ("S4 AC-4: ..."); the object URL for a download is a `blob:` URL the origin guard allows and it is revoked.
- Keyboard: the hidden file inputs are not in the Tab order (the visible buttons are); the dialog traps focus natively and restores it ("S4 AC-5: ...").
- 1024 px: the header fits without horizontal scroll in all three engines ("S4 AC-5: ..." checks `scrollWidth <= 1024`); so does a filter bar with many long chips (EC-6).
- What this story could break (graph: `App()` is used by `main.tsx` and `App.test.tsx`; the data layer by its tests only): S1's "App renders the Skills dashboard heading", "built dist is served ... with the app title", "built app requests only its own origin" and the axe check on the shell must still pass; the `h1` text and the title stay, and sample data is bundled, not fetched. The full suite runs in Step 7.

## Review findings
| ID | Finding | Handling | Test |
|---|---|---|---|
| EC-1 | Non-UTF-8 files (Windows-1252 from Excel's "CSV (Comma delimited)", UTF-16 "Unicode text") are decoded by `file.text()` into U+FFFD or junk and load with damaged names or misleading "Missing column" errors | New `src/app/readFile.ts`: `arrayBuffer()`, UTF-16 BOM rejected, UTF-8 BOM stripped, `TextDecoder('utf-8', { fatal: true })`; failure → file-level dialog "The file must be saved as CSV UTF-8 ..."; data unchanged | tests/unit/load-file.test.tsx › "S4 EC-1: Windows-1252 and UTF-16 files are refused with a CSV UTF-8 message and nothing is loaded" |
| EC-2 | Disabling the focused load button sends focus to `<body>`, so after the error dialog closes focus does not return to the load button | Busy state cleared in the same update that sets the dialog content; `showModal()` in an effect after that render; the opener is kept in a ref and `.focus()`ed on the dialog's `close` event; also checked in the AC-5 e2e walk, twice in a row | tests/unit/load-file.test.tsx › "S4 EC-2: focus returns to the load button after the error dialog closes, also on a second bad load" |
| EC-3 | File-wide problems (empty, header only, unclosed quote, missing columns) would get the row-problems text ("1 rows have problems", "File checked: 0 rows · 1 rows with problems"); plurals are fixed | `summariseErrors`: `rowCount === 0` or no bad data row → file-level variant with the reason(s) only; header problems listed separately; counts exclude the header; singular/plural text | tests/unit/load-file.test.tsx › "S4 EC-3: empty, header-only, unclosed-quote and missing-column files use the file-level dialog and one bad row reads 1 row has problems" |
| EC-4 | Free-text filter values with `&`, `=`, `+`, `%`, `#`, `/`, ", " are not round-tripped by the hash query and a comma reads as two values | `hrefFor` encodes each key and value with `encodeURIComponent`; the parser splits on `&` / first `=` before decoding and never maps `+` to space; chip values are separate spans and the remove label quotes each value | tests/unit/router.test.ts › "S4 EC-4: hrefFor and the hash parser round-trip values with & = + % # / comma emoji and 200 characters" |
| EC-5 | A 5 MB file with every cell bad gives hundreds of thousands of errors; one `<tr>` per error inside the modal can freeze the tab | One table row per bad row (its problems on separate lines in the cell), first 500 rendered with the dialog and the rest appended 2,000 per frame until every bad row is listed (AC-4 kept); the problem-list CSV has every error | tests/unit/load-file.test.tsx › "S4 EC-5: a 5 MB file with every cell bad opens the dialog at once and eventually lists every bad row" |
| EC-6 | The 44 px fixed filter bar overflows or clips with many or 200-character chips at 1024 px | `min-height: 44px`, `flex-wrap: wrap`, wrapping chip text; the e2e width check runs on a route with five teams and a 200-character role | tests/e2e/shell.spec.ts › "S4 EC-6: many long filter chips wrap without horizontal scroll at 1024 px and stay clickable" |
| EC-7 | A rejected read leaves both load buttons disabled forever with no message and an unhandled rejection | `try/catch/finally` around read + validate: catch → file-level "The file could not be read ..." dialog; `finally` re-enables the buttons and resets the input | tests/unit/load-file.test.tsx › "S4 EC-7: a file that cannot be read shows a dialog and re-enables the buttons" |
| EC-8 | Loading the same file twice gives the same status text, so the live region is not re-announced | Status is `{ text, id }` with a new `id` per set; the region renders `<span key={status.id}>` so the text node is replaced | tests/unit/load-file.test.tsx › "S4 EC-8: loading the same file twice replaces the status text node each time" |
| BUG-1 | The problem-list CSV can skip formula escaping, because escaping lived only in `exportCell` and S2 copies raw header text into `RowError.column` | `toCsv` applies `exportCell` to every cell itself, so every export (tables and the problem list) is escaped; no caller escapes separately | tests/unit/load-file.test.tsx › "S4 BUG-1: a duplicated formula-leading header gives a problem-list CSV whose Column and Reason cells start with '" |

## Steps
1. Write tests/unit/csv-export.test.ts, tests/unit/indexes.test.ts, tests/unit/DataTable.test.tsx, tests/unit/shell.test.tsx, tests/unit/router.test.ts, tests/unit/load-file.test.tsx, tests/e2e/shell.spec.ts and the e2e fixtures from the tables above, including every Review findings test; run each with `npm run test:file -- <file>` and confirm they fail because the modules do not exist.
2. Add `toCsv` and `exportCell` to `src/data/csv.ts` and `src/data/indexes.ts`; make their unit tests green.
3. Add `src/app/download.ts` and `src/app/DataTable.tsx`; make AC-3 and the table edge cases green.
4. Add `src/app/store.tsx` and `src/app/router.ts`; then `Header`, `FilterBar`, the screens and the new `App.tsx`; make AC-1 and the router tests green.
5. Add `readFile.ts`, `LoadFile` and `LoadErrorsDialog` (UTF-8 check, try/catch/finally, focus order, file-level vs row-problems variants, chunked list, status `id`); make the load-flow unit tests and EC-1, EC-2, EC-3, EC-5, EC-7, EC-8, BUG-1 green.
6. Style with the tokens in `src/index.css`; run tests/e2e/shell.spec.ts (AC-2, AC-4, AC-5); screenshot the overview, skills with chips and the error dialog at 1280×800 into `test-results/` and compare with the design PNGs; fix differences in header, filter bar and dialog.
7. Full suite (`npm test && npm run test:e2e`), `validate_plan.py --check-tests`, preflight; then the verifier and the build report.

## Risks and rollback
- New UI modules plus a writer in `csv.ts`; no data-layer behaviour changes. Rollback is reverting the PR.
- Native `<dialog>` is supported by all three target engines; jsdom may lack `showModal`, so unit tests stub it and the real behaviour is covered in e2e.
- Downloads from `blob:` URLs and file choosers behave slightly differently per engine; the e2e tests use Playwright's `filechooser` and `setInputFiles`, and AC-3 is checked at unit level on the exported text.
- Decision to confirm: filters live in the URL hash query (`#/skills?team=Payments&role=...`), so "Clear all" is one navigation, a filtered view can be bookmarked, and S6/S7 read and write filters only through `router.ts`. Filter values are team, role and category names, never person names (SEC-2.3).
- Decision to confirm: until S5 to S8, the Team, Skill search and Person routes show their title and the selected quarter only.
- Decision to confirm: CSV exports start with a UTF-8 BOM and use CRLF line ends so Excel opens names like "Zoë" correctly; plain numbers such as `-0.1` are not prefixed with `'`; tab and carriage return are treated as formula-leading in addition to the spec's `=`, `+`, `-`, `@`.
- Decision to confirm: loading a quarter file selects that quarter (design.md), even if it is older than the latest; the selector's default (start-up) is always the latest.
- Decision to confirm: a target file replaces all targets (it is not merged).
- Decision to confirm: only UTF-8 CSV files are accepted (EC-1); Windows-1252 and UTF-16 files are refused with a "save as CSV UTF-8" message instead of being guessed.
- Decision to confirm: the error dialog lists one line per bad row with all its problems in that line, and adds rows in chunks for very large files (EC-5); every bad row is still listed, and the problem-list CSV has one line per problem.

## Out of scope
- The bodies of the overview, team, skill search and person screens, their filters' controls and their per-screen e2e export checks (S5 to S8).
- The 12,000-row load and screen-switch timing (S8, REQ-11) and the full keyboard walk across finished screens (S8).
- Saving loaded files, filters or the selected quarter between sessions (spec Out of scope).
