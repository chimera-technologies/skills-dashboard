import LoadFile from './LoadFile';
import { hrefFor, type Route, type Screen } from './router';
import { useData } from './store';

const NAV: [Screen, string][] = [
  ['overview', 'Overview'],
  ['team', 'Team'],
  ['skills', 'Skill search'],
];

export default function Header({ route }: { route: Route }) {
  const { quarters, selectedQuarter, selectQuarter } = useData();
  return (
    <header className="app-header">
      <h1 className="brand">Skills dashboard</h1>
      <nav aria-label="Screens">
        <ul>
          {NAV.map(([screen, label]) => (
            <li key={screen}>
              <a href={hrefFor(screen)} aria-current={route.screen === screen ? 'page' : undefined}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="header-tools">
        <label htmlFor="quarter">Quarter</label>
        <select id="quarter" value={selectedQuarter ?? ''} disabled={quarters.length === 0} onChange={(e) => selectQuarter(e.target.value)}>
          {quarters.length === 0 ? (
            <option value="">No data</option>
          ) : (
            quarters.map((q, i) => (
              <option key={q} value={q}>
                {i === 0 ? `${q} (latest)` : q}
              </option>
            ))
          )}
        </select>
        <LoadFile />
      </div>
    </header>
  );
}
