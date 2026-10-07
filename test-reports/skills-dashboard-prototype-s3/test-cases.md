# S3 test cases and status

Every test named for the story, with its status in each flow that ran it:

- **Build**: the build's own runs and the verifier, before the story PR opened
- **PR**: the PR's test check after the review gate
- **Main**: the tests on the base branch after the merge

CI logs give counts, not names: a passing suite marks each of its tests passing (see the runner summaries in [README.md](README.md)).

## Acceptance criteria

| ID | Test | File | Build | PR | Main |
|---|---|---|---|---|---|
| AC-1 | S3 AC-1: average is the mean to one decimal excluding unrated skills | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |
| AC-2 | S3 AC-2: change needs at least 3 ratings in both quarters and a loaded previous quarter | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |
| AC-3 | S3 AC-3: shortfall counts members below target and meets target is true at exactly 50% | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |
| AC-4 | S3 AC-4: a person who changed team counts in each quarter's team | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |

## Other tests

| ID | Test | File | Build | PR | Main |
|---|---|---|---|---|---|
| — | S3 EC: empty inputs give null, not-enough-data and empty gaps without throwing | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |
| — | S3 EC: rounding is half up on exact tenths | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |
| — | S3 EC: change uses the shown averages and has no float noise | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |
| — | S3 EC: previous quarter is the calendar quarter, not the previous loaded one | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |
| — | S3 EC: meets target at the boundaries | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |
| — | S3 EC: a target nobody in the team rated does not meet target | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |
| — | S3 EC: gaps list only the team's targeted skills | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |
| — | S3 EC: category and overall averages are weighted by rating | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |
| — | S3 EC: grouping by Map handles __proto__ and constructor names | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |
| — | S3 EC: metrics are pure and do not mutate inputs | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |
| — | S3 EC: metrics for all teams over 12,000 ratings take under 100 ms | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |
| — | S3 EC: metrics hold their invariants on the sample data | tests/unit/metrics.test.ts | ✅ | ✅ | ✅ |
