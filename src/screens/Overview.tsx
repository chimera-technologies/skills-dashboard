import { useMemo, type ReactNode } from 'react';
import DataTable, { type Column } from '../app/DataTable';
import { hrefFor, useRoute } from '../app/router';
import { useData } from '../app/store';
import { changeText, countText, deltaText, formatLevel } from '../data/format';
import type { Change } from '../data/metrics';
import { overviewFor, type CategoryRow, type SkillRow } from '../data/overview';
import { previousQuarter } from '../data/quarter';

const CHANGE_CLASS = { up: 'change-up', down: 'change-down', unchanged: 'change-same' };

function ChangeText({ change }: { change: Change }) {
  return <span className={change.kind === 'change' ? CHANGE_CLASS[change.direction] : 'muted'}>{changeText(change)}</span>;
}

function skillColumns(barClass: string): Column<SkillRow>[] {
  return [
    { key: 'rank', header: '#', value: (r) => r.rank },
    { key: 'skill', header: 'Skill', value: (r) => r.skill, sortable: true },
    { key: 'average', header: 'Avg level', value: (r) => r.average, render: (r) => formatLevel(r.average), sortable: true, align: 'right' },
    {
      key: 'bar',
      header: 'Bar',
      value: (r) => r.average,
      // % of the 0–5 scale, inside a fixed track
      render: (r) => (
        <span className="bar-track">
          <span className={barClass} style={{ width: `${(r.average / 5) * 100}%` }} aria-hidden="true" />
        </span>
      ),
      csv: false,
    },
  ];
}
const TOP_COLUMNS = skillColumns('bar');
const BOTTOM_COLUMNS = skillColumns('bar bar-low');

function Stat({ label, value, sub }: { label: string; value: string; sub: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

export default function Overview() {
  const { dataset, selectedQuarter, sources } = useData();
  const { filters } = useRoute();
  const q = selectedQuarter!;
  const prev = previousQuarter(q); // the calendar quarter before, not the last loaded one
  const ratings = dataset.quarters.get(q)!;
  const previousRatings = dataset.quarters.get(prev);
  const o = useMemo(() => overviewFor(ratings, previousRatings, filters), [ratings, previousRatings, filters]);

  // fixed keys, only the headers name the quarters, so a sort survives a quarter switch
  const categoryColumns = useMemo<Column<CategoryRow>[]>(
    () => [
      {
        key: 'category',
        header: 'Category',
        value: (r) => r.category,
        render: (r) => <a className="row-link" href={hrefFor('overview', null, { ...filters, category: [r.category] })}>{r.category}</a>,
        sortable: true,
      },
      { key: 'current', header: q, value: (r) => r.current, render: (r) => formatLevel(r.current), sortable: true, align: 'right' },
      { key: 'previous', header: prev, value: (r) => r.previous, render: (r) => formatLevel(r.previous), sortable: true, align: 'right' },
      { key: 'change', header: 'Change', value: (r) => changeText(r.change), render: (r) => <ChangeText change={r.change} /> },
    ],
    [q, prev, filters],
  );

  const source = sources.get(q);
  const prevSource = sources.get(prev);
  const subtitle =
    prevSource === undefined
      ? `${q} · ${source} · ${prev} is not loaded, so no change is shown`
      : prevSource === source
        ? `${q}, compared with ${prev} · ${source}`
        : `${q} (${source}), compared with ${prev} (${prevSource})`;
  const avg = o.averageChange;

  return (
    <>
      <div className="page-title">
        <h2>Organisation overview</h2>
        <p>{subtitle}</p>
      </div>
      {prevSource !== undefined && prevSource !== source && (
        <p className="muted">The two quarters come from different sources; changes compare them as loaded</p>
      )}
      {o.people === 0 && <p className="muted">No ratings match the applied filters</p>}
      <div className="stats">
        <Stat label="People" value={o.people.toLocaleString('en')} sub={deltaText(o.peopleDelta, prev)} />
        <Stat label="Teams" value={o.teams.toLocaleString('en')} sub={deltaText(o.teamsDelta, prev)} />
        <Stat label="Skills assessed" value={o.skills.toLocaleString('en')} sub={countText(o.categories, 'category', 'categories')} />
        <Stat
          label="Average level"
          value={formatLevel(o.average)}
          sub={
            <>
              <ChangeText change={avg} />
              {avg.kind === 'change' && ` from ${formatLevel(avg.previous)}`}
            </>
          }
        />
      </div>
      <div className="cards">
        <section className="card" aria-labelledby="top-skills">
          <h3 id="top-skills">Top 10 skills</h3>
          <DataTable
            caption={`Top 10 skills in ${q}`}
            columns={TOP_COLUMNS}
            rows={o.topSkills}
            initialSort={{ key: 'average', dir: 'descending' }}
            fileName={`top-10-skills-${q}.csv`}
          />
        </section>
        <section className="card" aria-labelledby="bottom-skills">
          <h3 id="bottom-skills">Bottom 10 skills</h3>
          <DataTable
            caption={`Bottom 10 skills in ${q}`}
            columns={BOTTOM_COLUMNS}
            rows={o.bottomSkills}
            initialSort={{ key: 'average', dir: 'ascending' }}
            fileName={`bottom-10-skills-${q}.csv`}
          />
        </section>
        <section className="card" aria-labelledby="category-averages">
          <h3 id="category-averages">Average per category</h3>
          <div className="card-sub">
            {q} against {prev}
          </div>
          <DataTable
            caption={`Average per category, ${q} against ${prev}`}
            columns={categoryColumns}
            rows={o.categoryRows}
            fileName={`category-averages-${q}.csv`}
          />
          <div className="muted footnote">
            Change is shown only when both quarters have at least 3 ratings; otherwise it reads "Not enough data". Unrated skills are left out,
            not counted as zero.
          </div>
        </section>
      </div>
    </>
  );
}
