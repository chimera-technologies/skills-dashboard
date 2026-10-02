# Skills Dashboard: Requirements

| | |
|---|---|
| Document | Requirements, skills dashboard prototype |
| Company | Larkspur Consulting (fictional) |
| Owner | Head of People Operations |
| Version | 1.0 |

## 1. Background and goal

Larkspur Consulting has about 300 consultants in 12 teams. Each consultant
rates their skills once a quarter in a spreadsheet: one row per person per
skill, with a level from 1 to 5. Team leads copy the sheet and build their
own charts, so every team reads the numbers differently, and nobody can
answer simple questions quickly: "Who knows Kubernetes at level 4 or
above?", "Which skills is the Data team missing?", "Did our cloud skills
improve since last quarter?"

We want a web dashboard that loads the quarterly skills file and answers
those questions in a few clicks, the same way for everyone. This first
version is a prototype with sample data only; real data and sign-in come
later.

**Success looks like:** a team lead can find the people with a given skill
at a given level, and see their team's gaps against its target, in under a
minute, without opening a spreadsheet.

## 2. Users

| User | Needs |
|---|---|
| Team lead | See their team's skills, gaps against targets and changes since last quarter |
| Resourcing manager | Find people with a skill at or above a level, across all teams |
| Head of People Operations | Organisation-wide view: strongest and weakest skills, trend over quarters |

In this prototype everyone sees everything; there is no sign-in.

## 3. Data

The dashboard reads CSV files, one per quarter, with these columns:

| Column | Example | Rules |
|---|---|---|
| employee_id | E0147 | Required, unique per person |
| name | Asha Rao | Required |
| team | Data | Required, one of the 12 teams |
| role | Senior Consultant | Required |
| skill | Kubernetes | Required, one of the skills in the skills list |
| category | Cloud | Required: Cloud, Data, Development, Delivery or Leadership |
| level | 4 | Required, a whole number from 1 to 5 |
| quarter | 2026-Q3 | Required, the same for every row of a file |

A separate file lists each team's **target level** per skill (team, skill,
target_level). Levels mean: 1 aware, 2 beginner, 3 practitioner, 4 expert,
5 leader.

The prototype ships with sample files for 4 quarters (about 300 fictional
people and 40 skills). Users can also load their own file in the same
format from their computer; it stays in the browser and is not uploaded
anywhere.

When a file has problems, the dashboard lists every bad row with the reason
(missing column, unknown skill, level outside 1 to 5, mixed quarters) and
does not load the file.

## 4. Screens and features

**4.1 Organisation overview** (the home screen)
- Headline numbers for the selected quarter: people, teams, skills
  assessed, average level.
- The 10 strongest and 10 weakest skills by average level.
- Average level per skill category, compared with the previous quarter
  (up, down or unchanged, with the difference).

**4.2 Team view**
- Pick a team. A heat map shows people (rows) against skills (columns),
  coloured by level, with a numeric value in each cell so colour is never
  the only signal.
- **Gaps**: for each skill with a target, how many people in the team are
  at or above the target, and the shortfall. Skills where fewer than half
  the team meet the target are highlighted.
- Change since the previous quarter for each skill's team average.

**4.3 Skill search**
- Pick a skill and a minimum level (default 3). See everyone at or above
  that level: name, team, role, level, and their level last quarter.
- Combine with filters for team and role. Sort by level or name.

**4.4 Person view**
- Open a person from any list. See all their skills by category, their
  level per quarter as a small chart, and where they are above or below
  their team's target.

**4.5 Across all screens**
- A quarter selector (default: the latest quarter loaded).
- Filters show what is applied and can be cleared in one click.
- Every table can be downloaded as CSV with the filters applied.

## 5. Rules and definitions

- **Average level** is the mean of the levels, shown to one decimal place.
  People who have not rated a skill are not counted as zero; they are left
  out of that skill's average.
- **Change since last quarter** compares the same skill (and team, where
  relevant) between the selected quarter and the one before. It is shown
  only when both quarters have at least 3 ratings for that skill, and
  shows "not enough data" otherwise.
- **Shortfall** for a team and skill is the number of team members below
  the team's target level for that skill. A team **meets** a skill's
  target when at least half its members are at or above the target level.
- A person who moves team between quarters appears in the team they had in
  each quarter.

## 6. Quality and constraints

- **Accessibility:** WCAG 2.2 AA. All charts have a table or text
  alternative, the heat map shows numbers as well as colours, and
  everything works with a keyboard.
- **Performance:** loading a quarter of 300 people and 40 skills (12,000
  rows) and switching screens each take under 1 second on a normal laptop.
- **Browsers:** current Chrome, Edge, Firefox and Safari on desktop; usable
  from 1024 px wide (mobile is not needed in this prototype).
- **Privacy:** sample data only, with fictional names. A file a user loads
  is processed in their browser and never sent to a server, stored or
  logged.
- **Stack:** not decided. The team knows TypeScript; the technical lead
  should choose the simplest stack that meets the requirements. Hosting is
  not needed for the prototype beyond running it locally or as static
  files.

## 7. Out of scope

- Sign-in, roles and per-team access
- Editing ratings in the dashboard (ratings still come from the quarterly
  file)
- Connecting to the HR system or any database
- Email reports or alerts
- Mobile layouts

## 8. Open questions

1. Should people who left the company still appear in past quarters?
2. Is the 50% rule for "meets target" right for every team, or should
   each team set its own threshold?
3. Do resourcing managers need to export a person's full skill history, or
   only the current quarter?
