# S1 test cases and status

Every test S1 added, with its status in each flow that ran it.

- **Build**: the build job's runs and the verifier, before story PR #12 opened.
- **PR**: `pr / e2e` and `pr / traceability` on story PR #12.
- **Main**: `tests / e2e` on `main` after the merge (`760e991`).
- E2E tests run in Chromium, Firefox and WebKit; ✅ means all three passed.

CI logs report counts, not test names: each run reported all tests passing with
none skipped (unit 8/8, e2e 15/15), and the counts match the tests listed here.

## Acceptance criteria

| ID | Test | File | Type | Build | PR | Main |
|---|---|---|---|---|---|---|
| AC-1 | S1 AC-1: lock file and scripts support a clean-checkout install, test, build and e2e run | tests/unit/toolchain.test.ts | unit | ✅ | ✅ | ✅ |
| AC-2 | S1 AC-2: built dist is served by vite preview with the app title | tests/e2e/scaffold.spec.ts | e2e ×3 | ✅ | ✅ | ✅ |
| AC-3 | S1 AC-3: built app requests only its own origin | tests/e2e/scaffold.spec.ts | e2e ×3 | ✅ | ✅ | ✅ |
| AC-4 | S1 AC-4: npm audit reports no high or critical vulnerabilities | tests/unit/toolchain.test.ts | unit | ✅ | ✅ | ✅ |

AC-4 also has a live check: `scripts/audit-check.mjs` runs `npm audit --audit-level=high` after the unit tests in every `npm test`. Result in every flow: 0 vulnerabilities.

## Review findings (must fix, from the plan review)

| ID | Test | File | Type | Build | PR | Main |
|---|---|---|---|---|---|---|
| EC-1 | S1 EC-1: equivalent spellings of a test path go to the same runner | tests/unit/toolchain.test.ts | unit | ✅ | ✅ | ✅ |
| EC-2 | S1 EC-2: audit check passes a moderate-only report and reports registry errors | tests/unit/toolchain.test.ts | unit | ✅ | ✅ | ✅ |
| EC-3 | S1 EC-3: test:file runs exactly one regular test file and rejects anything else | tests/unit/toolchain.test.ts | unit | ✅ | ✅ | ✅ |
| EC-4 | S1 EC-4: a runner that fails to start or is killed exits non-zero | tests/unit/toolchain.test.ts | unit | ✅ | ✅ | ✅ |
| EC-5 | S1 EC-5: e2e runs against a fresh build | tests/e2e/scaffold.spec.ts | e2e ×3 | ✅ | ✅ | ✅ |
| EC-6 | S1 EC-6: unit tests run without the npm registry | tests/unit/toolchain.test.ts | unit | ✅ | ✅ | ✅ |
| BUG-1 | S1 BUG-1: origin guard catches late fetches, WebSockets and worker requests to other hosts | tests/e2e/scaffold.spec.ts | e2e ×3 | ✅ | ✅ | ✅ |

## Harness tests

| ID | Test | File | Type | Build | PR | Main |
|---|---|---|---|---|---|---|
| — | S1 harness: App renders the Skills dashboard heading | tests/unit/App.test.tsx | unit | ✅ | ✅ | ✅ |
| — | S1 harness: axe-core finds no violations on the shell | tests/e2e/scaffold.spec.ts | e2e ×3 | ✅ | ✅ | ✅ |

## Totals

| | Test cases | Runs | Build | PR | Main |
|---|---|---|---|---|---|
| Unit (Vitest) | 8 | 8 | 8/8 | 8/8 | 8/8 |
| E2E (Playwright) | 5 | 15 | 15/15 | 15/15 | 15/15 |
| Traceability (`validate_plan.py --check-tests`) | 11 IDs (AC-1–4, EC-1–6, BUG-1) | 1 | OK | OK | — |
