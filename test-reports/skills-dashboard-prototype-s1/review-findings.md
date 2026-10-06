# S1 review findings and verification

## Plan review (`sdlc:review-plan`, plan PR #11)

Verdict: ⚠️ concerns. A panel of 4 reviewers (inputs, failures, correctness,
regressions-security), with 2 skeptics checking every finding above low. Found
6 missed edge cases and 8 bugs (0 critical, 1 high, 7 low). Edge cases and
critical or high bugs must be fixed in the story with a test; low bugs are optional
and go to the Jira story.

| ID | Severity | Finding | Required | Status |
|---|---|---|---|---|
| EC-1 | edge case | `test:file` sends `./`, absolute or `\` paths to the wrong runner | yes | ✅ fixed, tested |
| EC-2 | edge case | `npm audit --json` exits non-zero on moderate findings and has no `metadata` on registry errors | yes | ✅ fixed, tested |
| EC-3 | edge case | the runner treats the file as a substring filter; directories and files outside the test folders get through | yes | ✅ fixed, tested |
| EC-4 | edge case | a runner that fails to start or is killed gives exit 0 | yes | ✅ fixed, tested |
| EC-5 | edge case | `reuseExistingServer` lets e2e test a stale `dist/` | yes | ✅ fixed, tested |
| EC-6 | edge case | registry calls inside unit tests make every test run need the network | yes | ✅ fixed, tested |
| BUG-1 | 🟠 high | the AC-3 origin guard misses WebSockets, worker requests and late requests | yes | ✅ fixed, tested |
| BUG-2 | low | AC-4 test fails on a moderate-only audit | no | ✅ fixed by EC-2 |
| BUG-3 | low | `process.exit(null)` gives a false pass | no | ✅ fixed by EC-4 |
| BUG-4 | low | tsconfig and `vite.config.ts` as planned would not type-check | no | ✅ fixed (`target` ES2022, `module` ESNext, `defineConfig` from `vitest/config`) |
| BUG-5 | low | runner routing without path normalisation | no | ✅ fixed by EC-1 and EC-3 |
| BUG-6 | low | `reuseExistingServer` contradicts the "never stale" claim | no | ✅ fixed by EC-5 |
| BUG-7 | low | `npx` can download an unpinned runner when `node_modules` is missing | no | ❌ open: `scripts/test-file.mjs` still runs plain `npx` |
| BUG-8 | low | the `line` reporter never writes `playwright-report/`, so the CI artifact is empty | no | ❌ open: `playwright.config.ts` still uses `reporter: 'line'` |

## Verifier (`sdlc:verifier`, before story PR #12)

**VERDICT: PASS.** AC-1–AC-4, EC-1–EC-6 and BUG-1 all passed: 8/8 in `npm test`
and 15/15 in `npm run test:e2e`. The Files table matches the working tree, with
no dependencies outside the plan and no external hosts in `index.html` or `src/`.

Low note: `tests/e2e/helpers/origin-guard.ts` also uses `context.routeWebSocket`
(covered by the BUG-1 test) but the plan's Files row does not mention it.

## PR review gate (`sdlc:review-story`, story PR #12)

**✅ clean: 0 high, 0 medium, 0 low.** A 4-lens panel (scope, criteria, design,
rules-security) with 2 skeptics per finding. The scaffold matches the Files
table, every AC and review finding has a named S1 test, S1 has no screens
(design.md marks it "No UI"), and REVIEW.md, CLAUDE.md and the security rules
are met. Advisory `code-review`: passed.
