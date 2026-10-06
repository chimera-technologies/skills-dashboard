# S2 review findings and verification

## Plan review (`sdlc:review-plan`, plan PR #13)

Verdict: ⚠️ concerns. The main risk was cross-row checks (duplicate, employee
details) running on rows with missing or invalid keys. Found 6 missed edge
cases and 3 bugs (0 critical, 1 high, 2 low). Edge cases and critical or high bugs
must be fixed in the story with a test; low bugs are optional and go to the Jira
story.

| ID | Severity | Finding | Required | Status |
|---|---|---|---|---|
| EC-1 | edge case | separator-only rows (`,,,,,,,`) give 8 missing-value errors and reject a valid file | yes | ✅ fixed, tested |
| EC-2 | edge case | employee ids with `/`, `#`, `?` or spaces load and later break `#/person/:employeeId` | yes | ✅ fixed, tested |
| EC-3 | edge case | a missing `employee_id` or `skill` column makes dependent checks misreport or throw | yes | ✅ fixed, tested |
| EC-4 | edge case | non-ASCII values untested; `.length` counts UTF-16 units | yes | ✅ fixed, tested |
| EC-5 | edge case | case and spacing rules for team/skill values unspecified | yes | ✅ fixed, tested |
| EC-6 | edge case | a trailing comma on the header or rows fails every row | yes | ✅ fixed, tested |
| BUG-1 | 🟠 high | duplicate and details checks run on rows with missing or invalid keys | yes | ✅ fixed, tested |
| BUG-2 | low | duplicate message says "same quarter" but the key ignores quarter | no | ❌ open: `src/data/validate.ts:137-140` keys on employee and skill only |
| BUG-3 | low | importing the generator in a test could rewrite the sample files | no | ✅ fixed: entry-point guard in `scripts/generate-sample-data.mjs:93` |

## Verifier (`sdlc:verifier`, before story PR #17)

**VERDICT: PASS.** AC-1–AC-4, EC-1–EC-6 and BUG-1 all passed, each with its
named test. No scope, repo-rule or security problems: no new dependencies,
lookups use `Map` and `Set`, reasons never echo names, and the error copy
matches the plan.

Note: the verifier ran `npm test` and `tsc` but not e2e or the build. The builder
ran both (build clean, e2e 15/15).

## PR review gate (`sdlc:review-story`, story PR #17)

**✅ clean: 0 high, 0 medium, 0 low.** A 4-lens panel (scope, acceptance
criteria, design, rules-security) with 2 skeptics per finding. All 23 changed
files are in the plan's Files table, every AC has a named test, all must-fix
findings are implemented with matching tests, and no SEC rule or REVIEW.md rule
is broken. Advisory `code-review`: passed.

## Builder notes for the reviewer

- No `tsconfig.json` change was needed: JSON imports type-check with `moduleResolution: bundler`.
- Sample files are regenerated with `node scripts/generate-sample-data.mjs`; a test checks the committed files match the generator byte for byte.
- The mockups use different category names (Engineering, Cloud and platform, Consulting). The build follows the spec: Cloud, Data, Development, Delivery, Leadership.
