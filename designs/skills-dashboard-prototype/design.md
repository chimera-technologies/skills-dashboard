---
id: skills-dashboard-prototype
spec: specs/skills-dashboard-prototype.md
source: mockup
figma_file: none
figma_file_key: none
owner: "@bala-chimera"
created: 2026-10-02
---

# Design: Skills dashboard prototype

## Screens
| Screen | Source | Screenshot | Stories | Requirements |
|---|---|---|---|---|
| overview | mockups/overview.html | screens/overview.png | S4, S5 | REQ-4, REQ-5, REQ-9, REQ-10, REQ-12 |
| team-view | mockups/team-view.html | screens/team-view.png | S4, S6 | REQ-4, REQ-6, REQ-9, REQ-10 |
| skill-search-results | mockups/skill-search-results.html | screens/skill-search-results.png | S4, S7 | REQ-7, REQ-9, REQ-10 |
| skill-search-no-results | mockups/skill-search-no-results.html | screens/skill-search-no-results.png | S7 | REQ-7, REQ-9 |
| person-view | mockups/person-view.html | screens/person-view.png | S8 | REQ-4, REQ-8, REQ-9, REQ-10 |
| load-file-errors | mockups/load-file-errors.html | screens/load-file-errors.png | S2, S4 | REQ-2, REQ-13 |

All screens are desktop, 1280x800, and must also work from 1024 px wide
(REQ-12). Every screen shares one header: app name, the three screen links
(Person is reached from a name, not the nav), the quarter selector
(defaults to the latest loaded quarter), "Load quarter file" and "Load
target file"; under it the applied-filter bar with one chip per filter and
"Clear all" (REQ-9).

## States
- overview: filled with sample data for 2026-Q3 against 2026-Q2; no
  filters applied ("No filters applied"). Category change shows ▲ Up,
  ▼ Down or ● Unchanged with the difference in text, never colour alone
  (REQ-5, REQ-10). Where either quarter has fewer than 3 ratings, or the
  previous quarter is not loaded, the cell reads "Not enough data" (REQ-4).
- team-view: heat map with the level number in every cell, "–" plus a
  hatched cell for not rated, and a visible focus ring on a cell to show
  keyboard movement (announced as person, skill, level). Gaps table: rows
  below target have a tinted background, a left bar and a "⚠ Below target"
  label (more than colour); a "Not enough data" change cell (REQ-4, REQ-6,
  REQ-10). The heat map scrolls inside its card for teams of more than
  11 people.
- skill-search-results: Kubernetes at level 3 or above with Team and Role
  filters applied as chips; sorted by level descending; last-quarter level
  shows "Not rated" or "Not in file" when absent (REQ-7).
- skill-search-no-results: empty state with the reason in words, how many
  match outside the filters, one-click "Remove filter" and "Set minimum
  level to 3" actions; Download CSV is disabled with "(no rows)" (REQ-7,
  REQ-9).
- person-view: skills grouped by category with "Above / At / Below target"
  in text and the difference; "No team target" and "Not rated" states; the
  per-quarter line chart has an SVG title and an equivalent table, which
  also shows the team the person was in each quarter (REQ-4, REQ-8, REQ-10).
- load-file-errors: modal over the unchanged overview; title names the
  file, says nothing was loaded and the data has not changed; one row per
  problem with row number, column and reason (missing column, bad level,
  unknown skill, unknown team, mixed quarters, missing value, duplicate);
  no names in messages (REQ-2, SEC-2.3). Focus starts on "Close".
- Decision to confirm (OQ-7): duplicate rows (same employee, skill and
  quarter) are shown as an error in the load-file-errors list.
- Decision to confirm (OQ-8): skills without a team target are left out of
  the team-view gaps table and show "No team target" on person-view.
- Decision to confirm (OQ-3): person-view "Download CSV (all loaded
  quarters)" exports the full loaded history, not only the current quarter.
- Decision to confirm (OQ-1): people who left appear in past quarters
  exactly as in that quarter's file; skill-search-results shows "Not in
  file" for the previous quarter when a person is absent from it.
- Decision to confirm (no OQ): the load-file error list is shown as a modal
  dialog with a "Download problem list (CSV)" button; a successful load
  shows a short status message (not mocked) and switches to that quarter.

## Tokens
- `color.text #1d2522`, `color.muted #55625d`, `color.accent #17715f`,
  `color.accent-soft #e3f1ed`
- `color.border #d9dfdc`, `color.surface #ffffff`, `color.page #f4f6f5`
- `color.warn #9a3d0a`, `color.warn-soft #fdf0e6` (below target, down)
- `color.error #b3261e`, `color.error-soft #fcebea` (load errors)
- `color.focus #1f5fae` (3 px focus outline, 2 px offset)
- Heat map levels: `heat.1 #f1f7f5`, `heat.2 #cfe7df`, `heat.3 #8fcab7`
  (dark text), `heat.4 #2f8f76`, `heat.5 #15584a` (white text); not rated
  is a grey hatch with "–"
- `type.body 14/20 system-ui`, `type.h1 22/28 700`, `type.h2 16/22 700`,
  `type.label 13/18 600`, `type.table 13/20`, `type.stat 28/36 700`
- `space.unit 8px`, `radius 6px`; header 56 px, filter bar 44 px,
  page padding 24 px

## No UI
- S1: scaffold, toolchain and test harness; no screen.
- S3: pure metric functions; their results appear on the overview, team and person screens.
