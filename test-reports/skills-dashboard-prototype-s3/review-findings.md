# S3 review findings and verification

## Plan review

### Plan review: ✅ clean

The plan covers all four S3 acceptance criteria with tests at the boundaries: rounding, the 3-rating minimum, exactly 50 %, a calendar previous quarter that isn't loaded, and team moves. S2's validator already rejects duplicate rows and invalid levels, and the build commands will run the new test file. One low maintainability issue remains in how the meets-target threshold is compared.

Potential bugs: 0 critical · 0 high · 1 low. Missed edge cases: 0.

#### Potential bugs (critical and high must fix; low optional)

| ID | Severity | Bug | Where | Scenario | Suggestion |
|---|---|---|---|---|---|
| BUG-1 | ⚪ low | Meets-target comparison is float multiplication, not float-free | Edge cases (meets-target boundaries); src/data/metrics.ts teamGaps | The plan says the threshold is compared 'without float division' as atOrAbove >= rated * MEETS_TARGET_SHARE. That is exact for 0.5, but if the OQ-2 constant later changes to 0.3, then 10 * 0.3 = 3.0000000000000004, so 3 of 10 at or above would wrongly count as not meeting target. | Store the share as an integer percentage (e.g. MEETS_TARGET_PERCENT = 50) and compare atOrAbove * 100 >= rated * MEETS_TARGET_PERCENT, or add a comment that the comparison is only exact for dyadic shares. |

_The review flags; it does not approve. The build follows the plan as merged._

## Verifier

## Verifier report

VERDICT: PASS

| AC | Test | Result | Note |
|---|---|---|---|
| AC-1 | S3 AC-1 | pass | checks 3.7, 1.5, 1.3, 3 of 5 rated (3.3), and null for an unrated skill |
| AC-2 | S3 AC-2 | pass | covers 2/3, 3/2, 0, an undefined previous quarter, no previous quarter in the dataset, and up/down/unchanged |
| AC-3 | S3 AC-3 | pass | 2 of 4 meets, 1 of 3 does not, a level equal to the target counts, unrated members are left out |
| AC-4 | S3 AC-4 | pass | teamMembers, teamGaps and teamSkillChange checked for both teams and both quarters |

Findings: none. Only the two files in the plan changed. No new dependencies, grouping uses Map/Set, and the functions are pure.

## PR review gate

### Conformance review: ✅ clean

No blocking issues. Reviewed by a 4-lens panel (scope, acceptance criteria, design, rules/security) with 2 skeptics per finding; 0 findings. Confirmed tests pass (16/16) and the build type-checks.

0 high · 0 medium · 0 low. The review flags; it does not approve. The owner decides.
Gate: fails on `high` or worse.
