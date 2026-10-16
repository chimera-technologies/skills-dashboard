# Coding patterns

The reusable patterns of this codebase. `sdlc:build-story` reads this file
before planning a story and follows it while building; the PR review checks
changes against it. Each story that creates something reusable adds it here
in the same PR. The generic catalogue these start from is the plugin's
`skills/build-story/reference/patterns.md`.

One entry per pattern: what to use, where it lives, and when.

## Project structure

<!-- Where each kind of code lives (feature folders, layers), and naming. -->

- `src/data/`: pure data code (parsing, validation, metrics, indexes); no React, no DOM.
- `src/app/`: the shell and shared UI (store, router, header, filter bar, table, file loading).
- `src/screens/`: one component per route; S5 to S8 replace the placeholders. Each screen's numbers come from a pure `src/data/<screen>.ts` function (see `overviewFor` in `src/data/overview.ts`), memoised in the screen with `useMemo`.
- Tests: `tests/unit/*.test.ts(x)` (Vitest, jsdom), `tests/e2e/*.spec.ts` (Playwright, three engines at 1024 px); names start `S<n> AC-<k>` / `S<n> EC...`.

## Errors and validation

<!-- How input is validated at the edges and how errors are returned or shown. -->

- File input: `LoadFile` (`src/app/LoadFile.tsx`) is the one entry point: `.csv` name and 5 MB checks, `readCsvFile` (`src/app/readFile.ts`, UTF-8 only), then `validateQuarterFile` / `validateTargetFile`. Never read a file anywhere else.
- Load errors are shown by `LoadErrorsDialog` (`src/app/LoadErrorsDialog.tsx`); `summariseErrors` decides file-level vs row problems. Build a file-level error as one `RowError` with `row: 1, column: null` and `rowCount: 0`.

## Data access and external calls

<!-- The one module that talks to storage, files or each external service. -->

- No network and no storage (REQ-13). Downloads go through `downloadCsv(fileName, rows)` (`src/app/download.ts`): BOM + `toCsv`, `blob:` URL, safe file name.
- `toCsv` (`src/data/csv.ts`) formula-escapes every cell itself; never build CSV text by hand.

## UI components

<!-- The UI library (ui_library in .sdlc/build.yaml), the theme or tokens,
     and the shared components built on it. -->

- No component library: plain elements styled by `src/index.css`, whose `:root` holds the design Tokens as CSS variables (`--color-*`, `--heat-*`, `--space`, `--radius`). Classes: `.btn`, `.btn-primary`, `.btn-link`, `.chip`, `.num` (right-aligned numbers), `.muted`.
- Tables: always `DataTable` (`src/app/DataTable.tsx`) with `columns` (`value` is what sorts and exports, `render` what shows); it gives sortable headers with `aria-sort` and "Download CSV" of the visible rows. `sortRows` is exported for non-table lists.
- `Column.csv: false` keeps a decorative column (a bar) on screen but out of the download.
- Columns named after a quarter: give them fixed keys (`current`, `previous`) and put the quarter only in `header`, so a sort survives a quarter switch.
- Text for numbers: `formatLevel` ("3.0", "–"), `changeText` ("▲ Up 0.2", "▼ Down 0.1", "● Unchanged", "Not enough data"), `deltaText` ("+4 since 2026-Q2", "−3 ...", "Unchanged", "2025-Q3 not loaded"), `countText(n, one, many)` in `src/data/format.ts`. Colour a change with `.change-up` / `.change-down` / `.change-same`, always next to that text.
- Screen layout classes: `.page-title` (h2 + muted subtitle), `.stats` / `.stat` (`.stat-label`, `.stat-value`, `.stat-sub`), `.cards` / `.card` (a surface card; a `DataTable` inside gets its Download CSV top right and a visually hidden caption, wide tables scroll inside the card), `.bar` / `.bar-low`, `.visually-hidden`.
- Modals: native `<dialog>` with `showModal()` in an effect, focus moved explicitly, opener refocused on `close` (see `LoadErrorsDialog`).

## State and configuration

<!-- Where state lives, how configuration and feature flags are read. -->

- Data: `useData()` from `src/app/store.tsx` (`DataProvider` in `App`): `dataset`, `indexes` (quarter → `QuarterIndex` from `src/data/indexes.ts`, use these instead of scanning ratings), `sources`, `quarters` (newest first), `selectedQuarter`, `status`, and the actions.
- Applying URL filters to ratings: `matchesFilters(rating, filters)` (`src/data/overview.ts`): OR within a key, AND across keys; an absent or empty key keeps everything.
- Route and filters: `useRoute()` and `hrefFor(screen, param, filters)` in `src/app/router.ts`. Filters (`team`, `role`, `category`) live in the hash query; change them only by navigating to `hrefFor(...)`.

## Testing

<!-- Test helpers, fixtures and builders to reuse; how tests are named and laid out. -->

- `tests/unit/helpers/app.tsx`: `stubBrowser()` (showModal/close for jsdom, captures downloads), `renderShell(hash)` (shell + real store; `data()` returns the store), `pick(label, ...files)`, `csvFile`, `quarterCsv`, `targetCsv`, and select/status queries.
- Screenshots for comparing with the design go to `.screenshots/` (git-ignored), written from an e2e test (see `tests/e2e/overview.spec.ts` EC-4).
- e2e: `guardOrigin` (`tests/e2e/helpers/origin-guard.ts`) for REQ-13; `AxeBuilder` for axe; files in `tests/e2e/fixtures/`. Register `page.on('filechooser', () => {})` before opening a chooser with the keyboard so interception is already on.
