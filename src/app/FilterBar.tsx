import { Fragment } from 'react';
import { FILTER_LABELS, hrefFor, type FilterKey, type Filters, type Route } from './router';

const KEYS = Object.keys(FILTER_LABELS) as FilterKey[];
// a value with a comma is quoted, so "Engineer, senior" is not heard as two values
const spoken = (v: string) => (v.includes(',') ? `"${v}"` : v);

// Filters live in the URL, so removing one or all of them is a single navigation.
export default function FilterBar({ route }: { route: Route }) {
  const keys = KEYS.filter((k) => route.filters[k]?.length);
  const go = (filters: Filters) => {
    if (route.screen !== 'not-found') location.hash = hrefFor(route.screen, route.param, filters);
  };
  return (
    <section className="filters" aria-label="Applied filters">
      <span className="label">Filters:</span>
      {keys.length === 0 ? (
        <span className="none">No filters applied</span>
      ) : (
        <>
          {keys.map((k) => {
            const values = route.filters[k]!;
            return (
              <span key={k} className="chip">
                <span>
                  {FILTER_LABELS[k]}:{' '}
                  {values.map((v, i) => (
                    <Fragment key={i}>
                      {i > 0 && ', '}
                      <span className="chip-value">{v}</span>
                    </Fragment>
                  ))}
                </span>
                <button
                  type="button"
                  className="x"
                  aria-label={`Remove filter ${FILTER_LABELS[k]}: ${values.map(spoken).join(', ')}`}
                  onClick={() => go({ ...route.filters, [k]: undefined })}
                >
                  ×
                </button>
              </span>
            );
          })}
          <button type="button" className="btn-link" onClick={() => go({})}>
            Clear all
          </button>
        </>
      )}
    </section>
  );
}
