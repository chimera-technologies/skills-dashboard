import FilterBar from './app/FilterBar';
import Header from './app/Header';
import { useRoute } from './app/router';
import { DataProvider, useData } from './app/store';
import Overview from './screens/Overview';
import Placeholder from './screens/Placeholder';

const TITLES = { team: 'Team', skills: 'Skill search', person: 'Person', 'not-found': null };

export function Shell() {
  const route = useRoute();
  const { selectedQuarter, status } = useData();
  return (
    <>
      <Header route={route} />
      <FilterBar route={route} />
      <main>
        {/* always mounted; a new key per message so a repeated message is announced again */}
        <div role="status" className="status">
          {status && <span key={status.id}>{status.text}</span>}
        </div>
        {route.screen === 'not-found' ? (
          <Placeholder title={null} />
        ) : selectedQuarter === null ? (
          <p>Load a skills file to get started.</p>
        ) : route.screen === 'overview' ? (
          <Overview />
        ) : (
          <Placeholder title={TITLES[route.screen]} />
        )}
      </main>
    </>
  );
}

export default function App() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}
