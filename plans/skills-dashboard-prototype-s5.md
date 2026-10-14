---
id: skills-dashboard-prototype-s5
spec: specs/skills-dashboard-prototype.md
story: S5
jira: SCRUM-18
branch: story/scrum-18-overview-screen
created: 2026-10-14
---

# Plan: S5 Organisation overview screen

## Story
The overview screen (`#/`) replaces the S4 placeholder: headline numbers
(people, teams, skills assessed, average level), the top 10 and bottom 10
skills by average level, and each category's average against the previous
calendar quarter, so anyone sees the same organisation-wide picture for the
selected quarter. Covers REQ-5, and the overview's part of REQ-4, REQ-9 and
REQ-10.

## Design
- overview: designs/skills-dashboard-prototype/screens/overview.png. Match,
  in order: `h2` "Organisation overview" with the muted subtitle
  "2026-Q3, compared with 2026-Q2 · Sample data (fictional)"; a row of four
  stat cards (label `type.label`, number `type.stat`, muted sub-line):
  People ("+4 since 2026-Q2"), Teams ("Unchanged"), Skills assessed
  ("5 categories"), Average level ("▲ Up 0.1 from 2.8"); then three cards
  side by side: "Top 10 skills" (columns #, Skill, Avg level ▼, Bar),
  "Bottom 10 skills" (#, Skill, Avg level ▲, Bar) and "Average per
  category" (sub-heading "2026-Q3 against 2026-Q2"; columns Category,
  the selected quarter, the previous quarter, Change; change cells "▲ Up 0.2",
  "▼ Down 0.1", "● Unchanged", "Not enough data"; the footnote "Change is
  shown only when both quarters have at least 3 ratings; otherwise it reads
  "Not enough data". Unrated skills are left out, not counted as zero.").
  Each card has its "Download CSV" link top right (the shared `DataTable`
  button). Tokens: `color.surface` cards with `color.border` and `radius`
  on `color.page`; top bars `color.accent`, bottom bars `color.warn`; Up in
  `color.accent`, Down in `color.warn`, Unchanged in `color.muted`, always
  with the arrow and the word (never colour alone); `space.unit` gaps,
  24 px page padding. At 1024 px the three cards wrap to two columns, never
  overflow sideways.
- Category names come from the reference list (Cloud, Data, Development,
  Delivery, Leadership), in that order; the mockup's names were placeholders.

## Files
| File | Change |
|---|---|
| src/data/overview.ts | new, pure (no React): `overviewFor(current: Rating[], previous: Rating[] \| undefined, filters: Filters)` returns `{ people, teams, skills, categories, average, averageChange, peopleDelta, teamsDelta, topSkills, bottomSkills, categoryRows }`. One pass over the filtered ratings. `matchesFilters(rating, filters)`: a rating is kept when, for every filter key present (`team`, `role`, `category`), its value is one of the listed values (OR within a key, AND across keys); reusable by S6 to S8. Skill rows `{ skill, category, average, ratings }` from `averageLevel` (S3), only skills with ≥1 rating; top = average descending, bottom = average ascending, ties by skill name ascending (`localeCompare`), each `slice(0, 10)` with `rank` 1..n. Category rows in `REFERENCE` category order, for each category with ≥1 rating in the current or the previous quarter: `current` and `previous` averages (null when none) and `change` from `changeSince` (S3, ≥3 ratings in both, else not enough data). `averageChange` = `changeSince(all filtered current, all filtered previous)`. `peopleDelta`/`teamsDelta` = count difference, or null when the previous quarter is not loaded |
| src/data/format.ts | new, pure: `formatLevel(n \| null)` ("3.0", or "–" for null) and `changeText(change)` ("▲ Up 0.2", "▼ Down 0.1", "● Unchanged", "Not enough data"); difference shown as its absolute value to one decimal. `deltaText(delta: number \| null, prev: string)`: delta > 0 "+4 since 2026-Q2", delta < 0 "−3 since 2026-Q2" (U+2212 minus, never "+-3"), 0 "Unchanged", null "2026-Q2 not loaded". `countText(n, one, many)`: "1 category", "0 categories", "5 categories". Reusable by S6 and S8 for every level, change, delta and count cell |
| src/screens/Overview.tsx | changed: the whole S5 body. Reads `useData()` (`dataset`, `selectedQuarter`, `sources`) and `useRoute().filters`; `useMemo(() => overviewFor(...), [ratings, previousRatings, filters])`; previous ratings from `dataset.quarters.get(previousQuarter(selectedQuarter))` (calendar quarter before, spec Design). Subtitle reads both sources, `sources.get(q)` and `sources.get(prev)`: when they are the same (or the previous quarter is not loaded) it is the mockup's "{q}, compared with {prev} · {source}"; when they differ it names each, "{q} ({source q}), compared with {prev} ({source prev})", followed by a muted line "The two quarters come from different sources; changes compare them as loaded" (EC-1). Stat-card sub-lines use `deltaText` (People, Teams) and `countText(categories, 'category', 'categories')` (Skills assessed) (EC-2). Renders four stat cards and three `DataTable`s with captions "Top 10 skills in {q}", "Bottom 10 skills in {q}", "Average per category, {q} against {prev}" (the visible card heading is an `h3`; the caption is visually hidden but read by screen readers). Top table `initialSort: { key: 'average', dir: 'descending' }`, bottom table `{ key: 'average', dir: 'ascending' }`; the `average` column's `value` is the number (not the formatted string), and `DataTable`'s stable sort keeps `overviewFor`'s A–Z tie order (BUG-1). Category table columns have fixed keys `category`, `current`, `previous`, `change`; only their `header` text carries the quarter names, so a sort survives a quarter switch (EC-3). File names `top-10-skills-{q}.csv`, `bottom-10-skills-{q}.csv`, `category-averages-{q}.csv`. Category names in the category table are links to `hrefFor('overview', null, { ...filters, category: [name] })` so a category filter can be applied from the screen (it then shows as a chip and "Clear all" removes it) |
| src/app/DataTable.tsx | changed: `Column.csv?: false` leaves a column out of the export (the decorative Bar column); everything else unchanged |
| src/index.css | changed: `.page-title`, `.stats` (4-column grid, 2 columns under 1100 px), `.stat`, `.stat-value`, `.cards` (`repeat(auto-fit, minmax(300px, 1fr))`), `.card`, `.bar` / `.bar-low` (width set inline as a % of 5), `.change-up` / `.change-down` / `.change-same`, `.visually-hidden` |
| tests/unit/overview-data.test.ts | new: pure tests of `overviewFor`, `matchesFilters`, `formatLevel`, `changeText` against small fixtures and the bundled sample data |
| tests/unit/overview.test.tsx | new: component tests through `renderShell('#/')` (real store with the sample data) and the quarter selector |
| tests/unit/DataTable.test.tsx | changed: one test that a `csv: false` column is shown but not exported |
| tests/e2e/overview.spec.ts | new: overview in the three engines at 1024 px: headline numbers, lists, category change, filter chip from a category link, CSV download matching the table, axe with no violations, keyboard reach |
| PATTERNS.md | changed: add `matchesFilters`, `formatLevel` / `changeText` / `deltaText` / `countText`, fixed column keys for quarter columns, `Column.csv: false`, and the `.card` / `.stats` classes |

## Tests
| AC | Acceptance criterion | Test |
|---|---|---|
| AC-1 | Headline numbers match the sample data for the selected quarter. | tests/unit/overview.test.tsx › "S5 AC-1: headline numbers match the sample data for each selected quarter"; tests/e2e/overview.spec.ts › "S5 AC-1: headline numbers match the sample data for the selected quarter" |
| AC-2 | Top and bottom 10 lists are ordered by average level, with a table alternative to any chart. | tests/unit/overview-data.test.ts › "S5 AC-2: top and bottom 10 skills are ordered by average level with ties by name"; tests/unit/overview.test.tsx › "S5 AC-2: top and bottom 10 are tables with the level as text next to each bar" |
| AC-3 | Category change shows up, down or unchanged with the difference, or "not enough data". | tests/unit/overview-data.test.ts › "S5 AC-3: category change is up, down or unchanged with the difference, or not enough data"; tests/e2e/overview.spec.ts › "S5 AC-3: category change shows direction and difference in text" |

How the tests know the expected numbers: they parse the bundled sample CSV
for the quarter (`SAMPLE_FILES` and `validateQuarterFile`) and count
distinct `employeeId`, `team`, `skill` and `category` and the mean level
independently of `overviewFor` (a plain loop in the test), then compare with
what the screen shows. They do not hard-code the mockup's 302 / 12 / 40.

## Edge cases
- Earliest loaded quarter (2025-Q4; 2025-Q3 not loaded): subtitle reads
  "2025-Q4 · Sample data (fictional) · 2025-Q3 is not loaded, so no change
  is shown"; People and Teams sub-lines read "2025-Q3 not loaded"; Average
  level and every category change read "Not enough data"; the previous
  column header is "2025-Q3" with "–" cells (tests/unit/overview.test.tsx ›
  "S5 AC-3: earliest quarter shows not enough data everywhere").
- Gap in loaded quarters (2026-Q4 missing, 2027-Q1 loaded from a file):
  compares with the calendar quarter before (2026-Q4), not the last loaded
  one, so changes read "Not enough data" (tests/unit/overview-data.test.ts ›
  "S5 AC-3: previous quarter is the calendar quarter, not the last loaded").
- Category with fewer than 3 ratings in either quarter, or with ratings in
  only one quarter: "Not enough data" for its change; a category with
  ratings only in the previous quarter still gets a row with "–" for the
  current average (tests/unit/overview-data.test.ts › "S5 AC-3: ...").
- Boundary of exactly 3 ratings in both quarters: change is shown
  (tests/unit/overview-data.test.ts › "S5 AC-3: ...").
- Rounding: averages use `averageLevel` (whole tenths, half up), shown with
  one decimal ("3.0", not "3"); the difference is the difference of the
  shown averages, so "Up 0.1 from 2.8" always agrees with "2.9"
  (tests/unit/overview-data.test.ts › "S5 AC-3: ..." and `formatLevel`
  cases).
- Fewer than 10 rated skills (a small loaded file): each list shows only the
  skills there are (1..n rows, the same skills may appear in both lists);
  0 skills shows the empty table and "Download CSV (no rows)" disabled
  (tests/unit/overview-data.test.ts › "S5 AC-2: ...").
- Ties at the 10th place: broken by skill name so the list is the same for
  everyone on every render (tests/unit/overview-data.test.ts › "S5 AC-2:
  ...").
- Sorting a top/bottom table by a header: rows re-order, "#" keeps each
  skill's rank, and the CSV follows the visible order (existing `DataTable`
  behaviour; tests/unit/DataTable.test.tsx covers export order).
- Filters in the URL (`#/?team=Payments&category=Data`): every number,
  list and category row uses only matching ratings; several values of one
  key are OR, different keys AND; the chips and "Clear all" are the S4
  filter bar (tests/unit/overview-data.test.ts › "S5 AC-1: filters keep only
  matching ratings"; tests/e2e/overview.spec.ts › "S5 AC-3: ...").
- Filters that match nothing, or an unknown value (`#/?team=Nope`): People,
  Teams and Skills assessed show 0, Average level "–" with "Not enough
  data", tables are empty with download disabled, and a line "No ratings
  match the applied filters" is shown (tests/unit/overview.test.tsx ›
  "S5 AC-1: filters matching nothing show zeros and empty tables").
- Hostile names in a loaded file (`=cmd|...`, `<script>`): shown as text by
  React and formula-escaped by `toCsv` in every download (existing S4
  behaviour; no `dangerouslySetInnerHTML` in this story).
- Quarter switched with the selector or a quarter file loaded/replaced:
  `useMemo` keys on the ratings arrays, so the screen recomputes; covered by
  AC-1 switching quarters and by loading `quarterCsv('2026-Q4')` in
  tests/unit/overview.test.tsx › "S5 AC-1: ...".
- No quarter loaded (sample failed to load): the S4 shell shows "Load a
  skills file to get started" and never renders the overview, so
  `overviewFor` is never called with a null quarter.
- Performance: one pass over at most 12,000 ratings per quarter, memoised;
  the 1 s screen budget is checked in S8 (REQ-11).
- What this could break: `Overview.tsx` is only used by `App.tsx`;
  `DataTable` gains an optional field, so S4's tables and tests are
  unchanged; tests/unit/shell.test.tsx expects the "Organisation overview"
  `h2`, which stays.
- Selected and previous quarter from different sources (a file loaded for
  2026-Q3 over the sample, 2026-Q2 still sample): the subtitle names both
  sources and a line says the quarters come from different sources
  (tests/unit/overview.test.tsx › "S5 EC-1: ...").
- Negative, zero and positive deltas, and counts of 0, 1 and many: "−3 since
  2026-Q3", "Unchanged", "+4 since 2026-Q2", "0 categories", "1 category"
  (tests/unit/overview-data.test.ts and tests/unit/overview.test.tsx › "S5
  EC-2: ...").
- Sort on a category quarter column, then quarter switched: fixed column
  keys keep the sort (tests/unit/overview.test.tsx › "S5 EC-3: ...").
- Rendered order of the top and bottom tables (the `initialSort` re-sorts
  them): checked on the screen, not only in `overviewFor`
  (tests/unit/overview.test.tsx › "S5 BUG-1: ...").

## Review findings
| ID | Finding | Handling | Test |
|---|---|---|---|
| EC-1 | The selected quarter can come from a loaded file while the previous quarter is still the fictional sample; the subtitle names only one source, so a mixed comparison is not visible. | Overview.tsx reads `sources.get(q)` and `sources.get(prev)`; when they differ the subtitle names each quarter's source and a muted line says the two quarters come from different sources. Same source keeps the mockup subtitle. | tests/unit/overview.test.tsx › "S5 EC-1: a file loaded over the sample names both sources in the subtitle" |
| EC-2 | Stat-card sub-lines were only specified for the mockup's values; a negative delta would read "+-3" and counts of 1 and 0 would read "1 categories". | `deltaText` and `countText` in src/data/format.ts: "−3 since {prev}", "Unchanged", "+4 since {prev}", "{prev} not loaded"; "1 category", "0 categories". Rendered through Overview.tsx. | tests/unit/overview-data.test.ts › "S5 EC-2: delta and count text for negative, zero, positive, 0, 1 and many"; tests/unit/overview.test.tsx › "S5 EC-2: sub-lines for fewer people, a category link and filters matching nothing" |
| EC-3 | A sort on a category column keyed by quarter name is silently dropped when the quarter selector changes. | Category table columns use fixed keys `category`, `current`, `previous`, `change`; only the header text names the quarter. | tests/unit/overview.test.tsx › "S5 EC-3: sort on the current-quarter column survives a quarter switch" |
| BUG-1 | AC-2 ordering was only checked in `overviewFor`; the tables' `initialSort` re-sorts the rendered rows and could reverse them or sort formatted strings. | Top `initialSort` average descending, bottom average ascending, `average` column value is the number; stable sort keeps A–Z ties. The screen test reads the rendered rows. | tests/unit/overview.test.tsx › "S5 BUG-1: rendered top and bottom tables are ordered by level, ties A–Z, ranks 1..n, aria-sort matches the arrow" |

## Steps
1. Write tests/unit/overview-data.test.ts (AC-2, AC-3, filters, edge cases)
   and the `csv: false` case in tests/unit/DataTable.test.tsx; run
   `npm run test:file -- tests/unit/overview-data.test.ts`, see them fail
   on the missing module.
2. Implement src/data/format.ts and src/data/overview.ts using
   `averageLevel`, `changeSince` (src/data/metrics.ts), `previousQuarter`
   (src/data/quarter.ts) and `REFERENCE` (src/data/reference.ts); add
   `csv?: false` to `DataTable`. Run until green.
3. Write tests/unit/overview.test.tsx (AC-1, AC-2, empty-filter case,
   earliest quarter, EC-1 file over sample, EC-2 sub-lines, EC-3 sort across
   a quarter switch, BUG-1 rendered order) using `renderShell`,
   `quarterSelect`, `pick` and `quarterCsv` from tests/unit/helpers/app.tsx;
   add the EC-2 `deltaText` / `countText` cases to
   tests/unit/overview-data.test.ts; see them fail.
4. Rewrite src/screens/Overview.tsx with the subtitle (both sources), stat
   cards (`deltaText`, `countText`) and three `DataTable`s (numeric
   `average` sort, fixed category column keys); add the CSS classes using the
   token variables. Run until green.
5. Write tests/e2e/overview.spec.ts (AC-1, AC-3, CSV download of the
   category table compared with the visible rows, axe, keyboard Tab to each
   Download CSV button and category link, `guardOrigin`); run it in the
   three engines at 1024 px.
6. Screenshot the overview at 1280×800 and 1024×800 into `test-results/`,
   compare with designs/skills-dashboard-prototype/screens/overview.png and
   fix layout, copy and colour differences.
7. `npm test && npm run test:e2e`, `validate_plan.py --check-tests`, update
   PATTERNS.md.

## Risks and rollback
- One screen, one new pure module and an optional `DataTable` field; rollback
  is reverting the PR.
- Decision to confirm: "Average level" on the overview is the mean of every
  rating in the quarter (all people, all skills), not the mean of the
  per-skill averages; the two differ when skills have different numbers of
  ratings.
- Decision to confirm: the overview honours the `team`, `role` and
  `category` filters in the URL for all its numbers, and its only filter
  control is the category link in the category table; no team or role
  pickers are added on the overview.
- Decision to confirm: People / Teams sub-lines show the count difference
  against the previous calendar quarter ("+4 since 2026-Q2", "Unchanged"),
  with no minimum-ratings rule (they are counts, not averages); the
  "Skills assessed" sub-line shows the number of categories.
- Decision to confirm: ties in the top/bottom 10 are broken by skill name
  (A to Z) in both lists.
- Decision to confirm: categories follow the reference list order, not the
  mockup's placeholder names.

## Out of scope
- Team, skill search and person screens (S6 to S8); links from skills to the
  skill search arrive with S7.
- Team and role filter controls (S6, S7).
- The 12,000-row timing and the four-screen keyboard walk-through (S8).
