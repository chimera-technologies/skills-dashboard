import { useMemo, useSyncExternalStore } from 'react';

export const FILTER_LABELS = { team: 'Team', role: 'Role', category: 'Category' } as const;
export type FilterKey = keyof typeof FILTER_LABELS;
export type Filters = Partial<Record<FilterKey, string[]>>;
export type Screen = 'overview' | 'team' | 'skills' | 'person';
export type Route = { screen: Screen | 'not-found'; param: string | null; filters: Filters };

const FILTER_KEYS = Object.keys(FILTER_LABELS) as FilterKey[];
const NOT_FOUND: Route = { screen: 'not-found', param: null, filters: {} };

// '#/team/Data%20Platform?team=A&role=B': each part is split before it is decoded, and '+' is never a space.
export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const q = raw.indexOf('?');
  try {
    const [name, param, ...rest] = (q === -1 ? raw : raw.slice(0, q)).split('/').filter((s) => s !== '').map(decodeURIComponent);
    const filters: Filters = {};
    for (const pair of q === -1 ? [] : raw.slice(q + 1).split('&')) {
      const eq = pair.indexOf('=');
      if (eq === -1) continue;
      const key = decodeURIComponent(pair.slice(0, eq));
      const value = decodeURIComponent(pair.slice(eq + 1));
      if (!FILTER_KEYS.includes(key as FilterKey) || value.trim() === '') continue;
      const list = (filters[key as FilterKey] ??= []);
      if (!list.includes(value)) list.push(value);
    }
    if (rest.length > 0) return NOT_FOUND;
    if (name === undefined) return { screen: 'overview', param: null, filters };
    if (name === 'team') return { screen: 'team', param: param ?? null, filters };
    if (name === 'skills' && param === undefined) return { screen: 'skills', param: null, filters };
    if (name === 'person' && param !== undefined) return { screen: 'person', param, filters };
    return NOT_FOUND;
  } catch {
    return NOT_FOUND; // malformed %-encoding
  }
}

export function hrefFor(screen: Screen, param?: string | null, filters: Filters = {}): string {
  const path = screen === 'overview' ? '#/' : `#/${screen}${param ? `/${encodeURIComponent(param)}` : ''}`;
  const query = FILTER_KEYS.flatMap((k) => (filters[k] ?? []).map((v) => `${k}=${encodeURIComponent(v)}`)).join('&');
  return query ? `${path}?${query}` : path;
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  return useMemo(() => parseHash(hash), [hash]);
}
