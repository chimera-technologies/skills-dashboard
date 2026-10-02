---
id: skills-dashboard-prototype
title: Skills dashboard prototype
author: Head of People Operations (Larkspur Consulting)
source: document
record_id: none
fingerprint: req-skills-dashboard-requirements-skills-dashboard-prototype
owner: "@bala-chimera"
owner_role: product-owner
risk: medium
systems: [unknown]
created: 2026-10-02
related: []
---

# Intent: Skills dashboard prototype

## Problem
About 300 consultants in 12 teams rate their skills (level 1 to 5) once a
quarter in a spreadsheet. Team leads copy the sheet and build their own
charts, so every team reads the numbers differently, and nobody can quickly
answer simple questions such as "Who knows Kubernetes at level 4 or
above?", "Which skills is the Data team missing?" or "Did our cloud skills
improve since last quarter?"

## Proposed outcome
A web dashboard that loads the quarterly skills file and answers those
questions in a few clicks, the same way for everyone. This first version is
a prototype on sample data only. It gives:
- an organisation overview for the selected quarter: headline numbers, the
  10 strongest and 10 weakest skills, and average level per category
  against the previous quarter;
- a team view: people against skills by level (numbers as well as colour),
  gaps against the team's target levels, and change since last quarter;
- a skill search: everyone at or above a minimum level (default 3) for a
  skill, with their level last quarter, filterable by team and role and
  sortable by level or name;
- a person view: all their skills by category, their level per quarter,
  and where they are above or below their team's target;
- on every screen: a quarter selector (default the latest), filters that
  show what is applied and clear in one click, and CSV download of every
  table with the filters applied.

Files come as one CSV per quarter plus a team target-level file. Sample
files for 4 quarters ship with it; users can also load their own file in
the same format. A file with problems is not loaded, and every bad row is
listed with its reason. The definitions of average level, change since last
quarter, shortfall and "meets target" in section 5 of the document apply.

## Affected users and systems
- Users/roles affected: team leads, resourcing managers, Head of People
  Operations. Everyone sees everything; there is no sign-in.
- Systems/services touched: a new skills dashboard web app; no existing
  system.

## Constraints
- Accessibility: WCAG 2.2 AA; every chart has a table or text alternative,
  and everything works with a keyboard.
- Performance: loading a quarter of 12,000 rows and switching screens each
  take under 1 second on a normal laptop.
- Browsers: current Chrome, Edge, Firefox and Safari on desktop, usable
  from 1024 px wide.
- Privacy: sample data with fictional names only. A file a user loads is
  processed in their browser and never sent to a server, stored or logged.
- Stack: not decided; the team knows TypeScript, and the technical lead
  should choose the simplest stack that meets the requirements. Hosting is
  only running it locally or as static files.

## Out of scope
- Sign-in, roles and per-team access
- Editing ratings in the dashboard
- Connecting to the HR system or any database
- Email reports or alerts
- Mobile layouts

## Evidence
- `requirements/skills-dashboard-requirements.md` (v1.0, owner Head of
  People Operations), sections 1 to 8.

## Open questions
- From the document: should people who left the company still appear in
  past quarters?
- From the document: is the 50% rule for "meets target" right for every
  team, or should each team set its own threshold?
- From the document: do resourcing managers need to export a person's full
  skill history, or only the current quarter?
- Owner to confirm: who owns the dashboard as a component? There is no
  entry in `.sdlc/owners.yaml`, so this is routed to the default owner.
- Owner to confirm risk: set to `medium` because the prototype uses
  fictional data and processes loaded files only in the browser. If users
  may load real employee files, it touches personal data and should be
  `high`.
- Owner to confirm: who maintains the list of 40 skills and the 12 teams
  that a loaded file is checked against, and does it ship with the sample
  data?

## Success looks like
A team lead can find the people with a given skill at a given level, and
see their team's gaps against its target, in under a minute, without
opening a spreadsheet.
