# Review instructions

Read by the PR review stage: `sdlc:review-story` reads this file directly,
and Claude Code Review reads it if it is enabled. General rules are in
`CLAUDE.md`.

## What high means here

Reserve **high** for findings that make the story wrong or unsafe: behaviour
that differs from the story's acceptance criteria or requirements in its
spec; missing input validation the spec requires; a security rule broken;
UI that visibly differs from the story's screens in `designs/`.
Naming, structure and small refactors are **low** at most.

## Always check

- Every acceptance criterion has a test named for `S<n> AC-<k>` that tests
  the behaviour, not just that something exists.
- No new dependency, service or network call that the spec does not name.

## Do not report

- Lock files, generated code, `graphify-out/`, test reports.
- Formatting a formatter would fix.

## Keep it short

At most 5 low findings; give the rest as a count. If nothing is medium or
high, start the summary with "No blocking issues."
