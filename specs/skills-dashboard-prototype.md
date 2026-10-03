---
id: skills-dashboard-prototype
title: Skills dashboard prototype
intent: intent/skills-dashboard-prototype.md
record_id: none
owner: "@bala-chimera"
tech_lead: "@bala-chimera"
risk: high
systems: [skills-dashboard]
created: 2026-10-02
---

# Spec: Skills dashboard prototype

## Summary
A static, browser-only web app that loads quarterly skills CSV files and a
team target-level file, and answers the same questions the same way for
everyone: an organisation overview, a team view, a skill search and a person
view, each with a quarter selector, clearable filters and CSV export. It
ships with fictional sample data for 4 quarters; a user may load their own
file, which is validated and processed only in the browser. Success: a team
lead finds people with a skill at a level, and their team's gaps, in under a
minute without a spreadsheet.

## Context
- The repository is new: `README.md`, the sdlc setup (`.sdlc/`, `.github/workflows/sdlc-*.yml`),
  the intent and `requirements/skills-dashboard-requirements.md` (v1.0). There is
  no application code, no `package.json` and no build or test commands
  (`.sdlc/build.yaml` has empty `toolchains` and `test_command`).
- `.sdlc/deploy.yaml` has `cloud: none`, `iac: none`; the Deploy stage is off in `.sdlc/sdlc.json`.
- No skills list, team list, sample data or target-level file exists in the
  repo. They must be created (see OQ-6).
- `.sdlc/owners.yaml` has no component entry; all roles fall to `@bala-chimera`.

## Requirements
| ID | Requirement | Verification |
|---|---|---|
| REQ-1 | Loads one CSV per quarter (columns per requirements §3) and one target file (team, skill, target_level). | Unit tests on the parser with valid fixtures. |
| REQ-2 | A file with any bad row is not loaded; every bad row is listed with row number and reason (missing column, unknown skill/team/category, level not a whole number 1–5, mixed quarters, missing required value). | Unit tests per reason; E2E test loads a bad file and sees the list. |
| REQ-3 | Ships sample files for 4 consecutive quarters (~300 fictional people, 12 teams, 40 skills, 5 categories) and a target file. | Sample files pass the loader; test asserts counts. |
| REQ-4 | Average level, change since last quarter (≥3 ratings in both quarters, else "not enough data"), shortfall and "meets target" (≥50% at or above target) follow requirements §5; unrated skills are excluded, not zero; a person counts in the team they had that quarter. | Unit tests per rule including edge cases. |
| REQ-5 | Organisation overview: people, teams, skills assessed, average level; top 10 and bottom 10 skills; average per category vs previous quarter (up/down/unchanged with difference). | Component tests against sample data. |
| REQ-6 | Team view: heat map of people × skills with the number in each cell; gaps table with shortfall, highlighting skills not meeting target; per-skill change since last quarter. | Component and E2E tests. |
| REQ-7 | Skill search: skill + minimum level (default 3); name, team, role, level, last-quarter level; filter by team and role; sort by level or name. | Component and E2E tests. |
| REQ-8 | Person view, reachable from any list of people: skills by category, level per quarter chart, above/below team target. | Component and E2E tests. |
| REQ-9 | Every screen: quarter selector (default latest loaded), applied filters shown and clearable in one click, CSV download of every table with filters applied. | E2E test per screen; export content compared with on-screen table. |
| REQ-10 | WCAG 2.2 AA: every chart has a table or text alternative, colour is never the only signal, everything works by keyboard. | axe-core in E2E tests with no violations; keyboard-only E2E walk-through; manual check recorded in the story PR. |
| REQ-11 | Loading a 12,000-row quarter and switching screens each take under 1 s on a normal laptop. | Timed E2E test with a 12,000-row file in the CI browser; budget 1 s. |
| REQ-12 | Works in current desktop Chrome, Edge, Firefox and Safari from 1024 px wide. | Playwright runs on Chromium, Firefox and WebKit at 1024 px. |
| REQ-13 | A loaded file never leaves the browser: no network request carries it, it is not written to storage and not logged. | E2E test asserts no network requests after the app loads and empty localStorage/sessionStorage/IndexedDB after a load. |

## Technology and architecture
Greenfield. The team knows TypeScript; hosting is local or static files only.

| Option | Trade-offs |
|---|---|
| A. Vite + React + TypeScript SPA, static build | Components suit four screens with shared filters; well-known test tools; one framework dependency |
| B. Vite + plain TypeScript | Fewest dependencies; hand-built state, rendering and accessibility |
| C. Next.js static export | Server features unused; more moving parts than static files need |

**Recommendation: A.** Supporting choices:
- Routing: hash-based routes (`#/team/Data`) so the static build works from
  any folder or `file://`-like local server; no server rewrites needed.
- Charts: hand-written SVG (bars, heat-map cells, small line chart) with a
  data table next to each; no chart library.
- CSV: a small in-house parser and writer (RFC 4180 quoting) with unit tests,
  avoiding a third-party parser of untrusted input (SEC-5.2).
- Tests: Vitest + Testing Library (unit/component), Playwright + @axe-core/playwright (E2E, accessibility, performance).
- Toolchain: Node LTS (exact version pinned in the repo), npm with lock file.

**Where it runs:** cloud none, IaC none, no containers or orchestration, no
staging or production environments; `npm run build` produces static files
in `dist/`, `npm run preview` serves them locally. No CI/CD deploy, so no
cloud credentials or IaC state. Smoke test: Playwright opens the built
`dist/` via `vite preview` and the overview shows the sample headline
numbers. No story is marked Infrastructure.

Decision needed from: tech lead (@bala-chimera).

## Design
- **Data layer (pure TS, no UI):** `parse` (CSV to rows), `validate`
  (rows to `{ok, quarter, ratings}` or `{errors: [{row, reason}]}`, checked
  against the reference lists of teams, skills and categories), and `metrics`
  (requirements §5 rules). A dataset is a map of quarter → ratings, plus targets.
- **Reference data:** `teams`, `skills` (skill → category) shipped as JSON
  with the sample data. A loaded file is checked against them.
- **Store:** one in-memory app state: loaded quarters, targets, selected
  quarter, filters per screen. Precomputed indexes per quarter (by team, by
  skill, by person) built once on load to meet REQ-11.
- **Loading:** sample files are bundled and loaded at start-up. "Load file"
  uses a file input (`.csv`, size limit 5 MB); the file is read with
  `FileReader` and validated; on success it adds or replaces that quarter in
  memory; on failure nothing changes and the error list is shown. A target
  file is loaded the same way.
- **Previous quarter:** the calendar quarter before the selected one; if it
  is not loaded, change shows "not enough data".
- **Screens:** Overview (`#/`), Team (`#/team/:team`), Skill search
  (`#/skills`), Person (`#/person/:employeeId`). A shared header holds the
  quarter selector, load buttons and applied-filter chips with "Clear all".
- **Tables:** one shared table component (sortable headers, caption,
  "Download CSV" exporting exactly the rows and columns shown). Exported cells
  starting with `=`, `+`, `-`, `@` are prefixed with `'` to prevent formula injection.
- **Heat map:** an HTML table with level number in each cell, colour plus
  number, header cells scoped for screen readers.
- **Rollout/rollback:** static build; rollback is rebuilding the previous commit.

## Security considerations
| Rule | Applies? | How this design satisfies it |
|---|---|---|
| SEC-1, SEC-6, SEC-8 | No | No sign-in, server, audit trail or AI in the prototype (intent out of scope). |
| SEC-2.1 | Yes | Fields read: employee_id, name, team, role, skill, category, level, quarter. Sample data is fictional. Real files would be personal data (OQ-5). |
| SEC-2.2 | Conditional | No storage and no new flow: files stay in browser memory (REQ-13). Review needed if real employee files are allowed. |
| SEC-2.3 | Yes | No logging, analytics or telemetry; error messages give row number and reason, not the row's name; routes use employee_id, not names; test fixtures are fictional. |
| SEC-4.1 | Yes | Every row validated for required values, types, allowed values and length (e.g. names ≤ 200 chars). |
| SEC-4.2 | Yes | React output encoding only; no `dangerouslySetInnerHTML`; CSV export escapes formula-leading characters. |
| SEC-4.3 | Yes | `.csv` only, 5 MB limit, parsed as text, never executed or served. |
| SEC-5.1 | Yes | Dependencies from npm, pinned via lock file, `npm audit` with no high or critical findings in CI. |
| SEC-5.2 | Yes | No third-party CSV parser; in-house parser covered by tests. Any later parser dependency needs review. |
| SEC-7.1 | Yes | No external services, fonts or CDNs; all assets bundled (REQ-13 test). |

## Open questions
| ID | Source | Question | Status | Answer or next step | Who |
|---|---|---|---|---|---|
| OQ-1 | intent | From the document: should people who left the company still appear in past quarters? | carried forward | Design assumes yes: each quarter shows exactly the people in its file. Owner to confirm. | @bala-chimera |
| OQ-2 | intent | From the document: is the 50% rule for "meets target" right for every team, or should each team set its own threshold? | carried forward | Built as a single constant (50%) in `metrics`; a per-team threshold column could be added later. Owner to confirm. | @bala-chimera |
| OQ-3 | intent | From the document: do resourcing managers need to export a person's full skill history, or only the current quarter? | carried forward | Design exports the person view's tables as shown, including the per-quarter table (full loaded history). Owner to confirm. | @bala-chimera |
| OQ-4 | intent | Owner to confirm: who owns the dashboard as a component? There is no entry in `.sdlc/owners.yaml`, so this is routed to the default owner. | open | Add a `skills-dashboard` component to `.sdlc/owners.yaml` if someone other than the default owns it. | @bala-chimera |
| OQ-5 | intent | Owner to confirm risk: set to `medium` because the prototype uses fictional data and processes loaded files only in the browser. If users may load real employee files, it touches personal data and should be `high`. | carried forward | Spec raised risk to `high` (see Areas of concern). Owner to confirm whether real files may be loaded. | @bala-chimera |
| OQ-6 | intent | Owner to confirm: who maintains the list of 40 skills and the 12 teams that a loaded file is checked against, and does it ship with the sample data? | carried forward | Design ships the lists as JSON with the sample data (S2), with invented team and skill names. Owner to name who maintains the real lists. | @bala-chimera |
| OQ-7 | spec | Is a duplicate row (same employee, skill and quarter) an error, and must one person have the same name, team and role on every row of a file? | open | Design treats both as errors listed per row. | @bala-chimera |
| OQ-8 | spec | How is the target file validated, and can a team lack targets for some skills? | open | Design: target_level 1–5, known team and skill; skills without a target are left out of the gaps table. | @bala-chimera |
| OQ-9 | spec | Is a 5 MB upload limit acceptable? | open | 12,000 rows is about 1 MB, so 5 MB leaves room. | @bala-chimera |

## Areas of concern
- **Risk raised to high.** The whole stack is new technology, and the app
  accepts user-loaded files that may contain real employee data (SEC-2.2,
  intent OQ-5). Options: keep `high` and have the tech lead approve; or
  restrict the prototype to sample files only and return to `medium`.
  Recommendation: keep `high`; it costs one approval from the same person.
  Decision needed from: @bala-chimera.
- **Stack decision.** Option A is recommended over B and C (above).
  Decision needed from: tech lead (@bala-chimera).
- **Performance in CI.** A 1 s budget on shared CI runners can be flaky.
  Options: assert in CI, or only locally. Recommendation: CI assertion plus
  a recorded laptop timing. Decision needed from: @bala-chimera.

## Work breakdown

### S1: App scaffold, toolchain and test harness
Vite + React + TypeScript project with Vitest, Playwright (Chromium,
Firefox, WebKit) and axe-core, building to static files.

Acceptance criteria:
- `npm ci`, `npm test`, `npm run build` and the E2E command succeed on a clean checkout.
- `npm run build` writes static files to `dist/`; `vite preview` serves a page with the app title.
- The built app makes no network requests to any host other than its own origin.
- `npm audit` reports no high or critical vulnerabilities.

### S2: CSV loader, validation and sample data
Parser, validator and reference lists, plus fictional sample files for 4
quarters and a target file.

Acceptance criteria:
- A valid file produces ratings for one quarter (REQ-1).
- Each error reason in REQ-2 is reported with its row number, every bad row is listed, and nothing is loaded.
- Sample data has 4 consecutive quarters, ~300 people, 12 teams, 40 skills, 5 categories, and passes validation (REQ-3).
- Parsing and validating a 12,000-row file takes under 300 ms in a unit benchmark.

### S3: Metrics and definitions
Pure functions for average level, change since last quarter, shortfall,
meets target and team membership per quarter.

Acceptance criteria:
- Average is the mean to one decimal, excluding unrated skills.
- Change shows "not enough data" unless both quarters have at least 3 ratings, or when the previous quarter is not loaded.
- Shortfall counts members below target; meets target is true at exactly 50%.
- A person who changed team counts in each quarter's team.

### S4: App shell: quarter selector, filters, tables and file loading
Header, routing, the shared table with CSV export, filter chips with
"Clear all", and the load-file flow with the error list.

Acceptance criteria:
- The quarter selector defaults to the latest loaded quarter.
- Applied filters are shown and "Clear all" removes them in one action.
- Downloaded CSV matches the visible rows, columns and sort, and escapes formula-leading characters.
- Loading a bad file shows every bad row and leaves the data unchanged; storage stays empty (REQ-13).
- All controls work by keyboard; axe-core reports no violations.

### S5: Organisation overview screen
Headline numbers, top and bottom 10 skills, category averages against the
previous quarter.

Acceptance criteria:
- Headline numbers match the sample data for the selected quarter.
- Top and bottom 10 lists are ordered by average level, with a table alternative to any chart.
- Category change shows up, down or unchanged with the difference, or "not enough data".

### S6: Team view screen
Heat map, gaps table and per-skill change for a chosen team.

Acceptance criteria:
- Every heat map cell shows its level number; cells are keyboard-reachable and announced with person and skill.
- Gaps table shows people at or above target and shortfall; skills not meeting target are highlighted by more than colour.
- Per-skill team change follows S3 rules.
- Opening a person from the team view goes to their person view.

### S7: Skill search screen
Find everyone at or above a level for a skill, with filters and sorting.

Acceptance criteria:
- Minimum level defaults to 3; results include name, team, role, level and last-quarter level.
- Team and role filters combine; sort by level or name both directions.
- Results and export reflect the filters; opening a person goes to their person view.

### S8: Person view screen and performance check
A person's skills by category, levels per quarter and position against
team target; plus the end-to-end performance test.

Acceptance criteria:
- Skills are grouped by category, each marked above, at or below the team target in text.
- The per-quarter chart has an equivalent table.
- Loading a 12,000-row quarter and switching between all four screens each take under 1 s (REQ-11).
- The keyboard-only walk-through covers all four screens at 1024 px in all three browser engines.

## Out of scope
- Sign-in, roles and per-team access
- Editing ratings in the dashboard
- Connecting to the HR system or any database
- Email reports or alerts
- Mobile layouts
- Hosting beyond local or static files; any cloud, IaC or deploy pipeline
- Saving loaded files or preferences between sessions
- Per-team "meets target" thresholds (see OQ-2)
