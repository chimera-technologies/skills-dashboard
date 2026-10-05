---
id: skills-dashboard-prototype-s3
spec: specs/skills-dashboard-prototype.md
story: S3
jira: SCRUM-16
branch: story/scrum-16-metrics
created: 2026-10-05
---

# Plan: S3 Metrics and definitions

## Story
Pure functions, shared by every screen, that apply the requirements §5 rules
the same way for everyone: average level, change since last quarter,
shortfall, meets target, and team membership per quarter. Covers REQ-4. Pure
TypeScript over the validated `Rating[]`, `Target[]` and `Dataset` from S2;
no UI. (design.md lists S3 under "No UI": its results appear on the
overview, team and person screens built in S5, S6 and S8.)

The rules, as the code will apply them:
- **Average level**: mean of the levels of the ratings present, rounded half
  up to one decimal. A person who did not rate a skill has no row for it in
  the file, so they are simply not in the mean (never counted as zero). No
  ratings gives `null`, not `0`.
- **Change since last quarter**: compares the selected quarter with the
  calendar quarter before it (`previousQuarter` from S2, not "the previous
  loaded quarter", per the spec's Design). Shown only when both quarters
  have at least 3 ratings in the compared set; otherwise, or when the
  previous quarter is not loaded, the result is "not enough data". The
  difference is the difference of the two averages as shown (one decimal),
  so the screen never shows "3.4 vs 3.2: ▲ 0.1"; direction is up, down or
  unchanged from that rounded difference.
- **Shortfall** for a team and skill with a target: the number of the
  team's members in that quarter who rated the skill below the target.
  **Meets target**: at least half (`MEETS_TARGET_SHARE = 0.5`, OQ-2) of the
  members who rated the skill are at or above the target; exactly 50 %
  meets. This is the team-view mockup's wording ("at least 50 % of rated
  members", "4 of 22", shortfall 18) and keeps unrated people out, as
  REQ-4 requires.
- **Team membership**: a person belongs to the team on their rows in that
  quarter's file; each quarter is computed from its own file, so a person
  who moved counts in the old team in the old quarter and the new team in
  the new one.

## Files
| File | Change |
|---|---|
| src/data/metrics.ts | new: constants `MIN_RATINGS_FOR_CHANGE = 3`, `MEETS_TARGET_SHARE = 0.5`; types `Change` (`{ kind: 'change', current, previous, difference, direction: 'up' \| 'down' \| 'unchanged' }` or `{ kind: 'not-enough-data' }`) and `Gap` (`skill`, `targetLevel`, `rated`, `atOrAbove`, `shortfall`, `meetsTarget`); functions `averageLevel(ratings)`, `changeSince(current, previous)`, `selectRatings(ratings, { team?, skill?, category? })`, `teamMembers(ratings, team)`, `teamGaps(ratings, targets, team)`, `teamSkillChange(dataset, quarter, team, skill)`. Pure: no module state, never mutates inputs; grouping uses `Map`/`Set` only |
| tests/unit/metrics.test.ts | new: AC-1..AC-4 tests and the edge-case tests below, on small hand-built `Rating[]` fixtures (fictional ids `E0001`…, team and skill names from the reference lists), plus one run over the sample dataset |

No change to S2's files: `previousQuarter` and the types are reused as they are.

## Tests
| AC | Acceptance criterion | Test |
|---|---|---|
| AC-1 | Average is the mean to one decimal, excluding unrated skills. | tests/unit/metrics.test.ts › "S3 AC-1: average is the mean to one decimal excluding unrated skills" (levels 3, 4, 4 → 3.7; a team of 5 where only 3 rated the skill averages those 3, not 5 with zeros; `selectRatings` for a skill nobody rated → `averageLevel` is `null`; 1, 2 → 1.5; 1, 1, 2 → 1.3) |
| AC-2 | Change shows "not enough data" unless both quarters have at least 3 ratings, or when the previous quarter is not loaded. | tests/unit/metrics.test.ts › "S3 AC-2: change needs at least 3 ratings in both quarters and a loaded previous quarter" (3 and 3 ratings → `kind: 'change'` with difference and direction; 2 and 3, 3 and 2, 0 and 3 → `not-enough-data`; `previous` undefined → `not-enough-data`; `teamSkillChange` when the dataset has no `previousQuarter(quarter)` → `not-enough-data`; up, down and unchanged each produced with the expected one-decimal difference) |
| AC-3 | Shortfall counts members below target; meets target is true at exactly 50%. | tests/unit/metrics.test.ts › "S3 AC-3: shortfall counts members below target and meets target is true at exactly 50%" (target 3, rated levels 2, 3, 4, 1 → `atOrAbove` 2, `shortfall` 2, `rated` 4, `meetsTarget` true; levels 2, 3, 1 → 1 of 3, false; a level equal to the target counts as at or above; unrated members are in neither count) |
| AC-4 | A person who changed team counts in each quarter's team. | tests/unit/metrics.test.ts › "S3 AC-4: a person who changed team counts in each quarter's team" (E0001 in Data in 2026-Q2 and Cloud in 2026-Q3: `teamMembers` puts them in Data for Q2 only and Cloud for Q3 only; `teamGaps` and `teamSkillChange` for Data use their Q2 rating in Q2 and leave it out of Q3, and for Cloud the reverse) |

## Edge cases
- No ratings at all (empty array, a skill nobody rated, a team with no members that quarter): `averageLevel` returns `null` so screens can say "No ratings" instead of a misleading 0.0 ("S3 AC-1: ..." and "S3 EC: empty inputs give null, not-enough-data and empty gaps without throwing").
- Exactly one rating: average is that level ("S3 EC: rounding is half up on exact tenths").
- Rounding: computed from integers as `Math.round(sum * 10 / n) / 10`, so a true mean of x.x5 rounds up (20 ratings summing 23 → 1.15 → 1.2; the naive `Math.round(1.15 * 10)` gives 1.1); 1, 2, 2, 2 → 1.8; 1, 1, 1, 2 → 1.3; 5, 5, 5 → 5 ("S3 EC: rounding is half up on exact tenths").
- Change boundaries: 3 ratings in both quarters is enough; 2 in either is not; 0 in the previous quarter (skill new this quarter) is not ("S3 AC-2: ...").
- Difference from the shown averages: 3.24 vs 3.26 (prev 3.2, now 3.3) gives `▲ 0.1`, up; equal shown averages give `difference` 0 (never `-0`) and `unchanged`; computed in integer tenths so 3.4 − 3.2 is exactly 0.2, not 0.19999 ("S3 EC: change uses the shown averages and has no float noise").
- Previous quarter is the calendar quarter before: with 2025-Q4 and 2026-Q2 loaded, 2026-Q2's change is "not enough data" (2026-Q1 missing), not a comparison with 2025-Q4; 2026-Q1's previous is 2025-Q4 across the year boundary ("S3 EC: previous quarter is the calendar quarter, not the previous loaded one").
- Selected quarter not loaded (unknown key in `dataset.quarters`): `teamSkillChange` returns `not-enough-data`, no throw ("S3 EC: empty inputs ...").
- Meets-target boundaries, compared without float division (`atOrAbove >= rated * MEETS_TARGET_SHARE`): 2 of 4 and 1 of 2 meet; 1 of 3 does not; 2 of 3 does; 4 of 22 does not, 12 of 24 does (the mockup's rows) ("S3 AC-3: ..." and "S3 EC: meets target at the boundaries").
- Target for a skill no member rated (rated 0): `atOrAbove` 0, `shortfall` 0, `meetsTarget` false; 0 of 0 is not "at least half" because no one has shown the level ("S3 EC: a target nobody in the team rated does not meet target").
- Team with no targets, or a team not in the quarter: `teamGaps` returns `[]`. Skills without a target for the team are not in `teamGaps` at all (OQ-8, the mockup's "Skills without a target are not listed"); targets for other teams are ignored ("S3 EC: empty inputs ..." and "S3 EC: gaps list only the team's targeted skills").
- Person who left or joined: a person absent from a quarter's file is not a member that quarter, and the previous quarter's average uses only that quarter's members (OQ-1) ("S3 AC-4: ...").
- Category filter: `selectRatings` with `category` uses the rating's own `category` (S2 checks it matches the skills list), so a category average is the mean of all that category's ratings, weighted by rating, not the mean of skill averages ("S3 EC: category and overall averages are weighted by rating").
- Hostile or odd names: team or skill values such as `__proto__` or `constructor` group correctly because grouping uses `Map` and `Set`, never plain objects ("S3 EC: grouping by Map handles __proto__ and constructor names").
- Inputs are never mutated and results are repeatable: tests pass frozen arrays (`Object.freeze`) and call each function twice with equal results ("S3 EC: metrics are pure and do not mutate inputs").
- Large input (REQ-11 budget is S4/S8's, but the metrics must not be the bottleneck): `teamGaps` and `teamSkillChange` for all 12 teams and their targeted skills over a 12,000-row quarter and its previous quarter finish in under 100 ms (median of 5 after a warm-up), each a single pass per call ("S3 EC: metrics for all teams over 12,000 ratings take under 100 ms").
- State left by S2: the sample dataset is valid by construction; a smoke test runs `teamGaps` and `teamSkillChange` for every team over `loadSampleDataset()` and checks every gap has `atOrAbove + shortfall === rated` and every change is either `not-enough-data` or has a one-decimal difference ("S3 EC: metrics hold their invariants on the sample data"). Nothing in `src/` calls the data layer yet, so nothing existing can break (graph: `Rating`, `Dataset` and `previousQuarter` are used only by `validate.ts`, `sample.ts` and their tests).
- Not handled here deliberately: invalid ratings (level 0, non-number, mixed quarters, one person in two teams in one file); S2's validator rejects such files, and the metrics accept only validated data. Per-quarter indexes for speed are S4's store.

## Steps
1. Write tests/unit/metrics.test.ts with the AC-1..AC-4 and edge-case tests above. Run `npm run test:file -- tests/unit/metrics.test.ts` and confirm it fails because `src/data/metrics.ts` does not exist.
2. Implement `averageLevel` (integer tenths, half up, `null` for none) and `selectRatings`; make AC-1 and the rounding tests green.
3. Implement `changeSince(current, previous)`: `not-enough-data` when `previous` is undefined or either side has fewer than `MIN_RATINGS_FOR_CHANGE` ratings; else difference of the rounded averages in integer tenths, direction from its sign. Then `teamSkillChange(dataset, quarter, team, skill)`, reading `dataset.quarters.get(quarter)` and `dataset.quarters.get(previousQuarter(quarter))` and selecting each by its own quarter's team. Make AC-2 green.
4. Implement `teamMembers` and `teamGaps(ratings, targets, team)`: one pass over the team's ratings into a `Map` of skill → levels, one `Gap` per target of that team in target-file order. Make AC-3 and AC-4 green.
5. Run the performance and sample-data edge-case tests; if over budget, select the team's ratings once per call instead of per target.
6. Full suite (`npm test && npm run test:e2e`), `npm run build` (type check), `validate_plan.py --check-tests`, preflight; then the verifier and the build report.

## Risks and rollback
- One new pure module and one test file; nothing calls them yet. Rollback is reverting the PR.
- The 100 ms metrics benchmark could flake on a busy CI runner; it is 10 times the expected cost, and median-of-5 after a warm-up reduces noise. If it still flakes, the spec's "Performance in CI" decision applies.
- Decision to confirm: shortfall and meets target count only members who rated the skill (as the team-view mockup states: "at least 50 % of rated members", "4 of 22"); a member who did not rate the skill is neither at or above nor below target.
- Decision to confirm: a targeted skill that no team member rated is shown as not meeting target (0 of 0), with shortfall 0.
- Decision to confirm: the change is the difference of the two averages as shown (each rounded to one decimal), so the text always matches the numbers on screen; "unchanged" means the shown averages are equal.
- Decision to confirm: averages are rounded half up (1.15 → 1.2), and category and overall averages are the mean of all ratings in the set (weighted by rating), not the mean of per-skill averages.
- Decision to confirm (OQ-2): the 50 % threshold is one constant, `MEETS_TARGET_SHARE`, for every team.

## Out of scope
- Per-quarter indexes, the app store and the quarter selector (S4).
- Top and bottom 10 skills, headline numbers and category rows (S5), the heat map and gap ordering and highlighting (S6), skill search and last-quarter level (S7), the person view's above/at/below target (S8): each screen composes these functions.
- Formatting numbers and the "▲ / ▼ / ●" and "Not enough data" copy (the screens).
- Per-team "meets target" thresholds (spec Out of scope, OQ-2).
