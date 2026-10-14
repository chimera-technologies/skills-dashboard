import { hrefFor } from '../app/router';
import { useData } from '../app/store';

// Team, Skill search and Person until S6 to S8; title null is the not-found page.
export default function Placeholder({ title }: { title: string | null }) {
  const { selectedQuarter } = useData();
  if (title === null) {
    return (
      <>
        <h2>Page not found</h2>
        <p>
          <a href={hrefFor('overview')}>Go to the overview</a>
        </p>
      </>
    );
  }
  return (
    <>
      <h2>{title}</h2>
      <p>{selectedQuarter}</p>
    </>
  );
}
