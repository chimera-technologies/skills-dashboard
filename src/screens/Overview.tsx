import { useData } from '../app/store';

// Placeholder until S5 builds the overview body.
export default function Overview() {
  const { selectedQuarter, sources } = useData();
  return (
    <>
      <h2>Organisation overview</h2>
      <p>
        {selectedQuarter} · {sources.get(selectedQuarter!)}
      </p>
    </>
  );
}
