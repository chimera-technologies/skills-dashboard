import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import { indexQuarter, type QuarterIndex } from '../data/indexes';
import { compareQuarters } from '../data/quarter';
import { loadSampleDataset } from '../data/sample';
import type { Dataset, QuarterFileResult, TargetFileResult } from '../data/types';

type Loaded<R> = Extract<R, { ok: true }>;
// id changes on every set, so the live region announces a repeated message again
export type Status = { text: string; id: number };

type State = {
  dataset: Dataset;
  indexes: Map<string, QuarterIndex>; // quarter -> index
  sources: Map<string, string>; // quarter -> "Sample data (fictional)" or the file name
  selectedQuarter: string | null;
  status: Status | null;
};

type Action =
  | { type: 'select'; quarter: string }
  | { type: 'quarter'; result: Loaded<QuarterFileResult>; fileName: string }
  | { type: 'targets'; result: Loaded<TargetFileResult>; fileName: string };

export type Data = State & {
  quarters: string[]; // newest first
  selectQuarter: (quarter: string) => void;
  addQuarter: (result: Loaded<QuarterFileResult>, fileName: string) => void;
  setTargets: (result: Loaded<TargetFileResult>, fileName: string) => void;
};

export const SAMPLE_SOURCE = 'Sample data (fictional)';
const newest = (quarters: Iterable<string>) => [...quarters].sort(compareQuarters).reverse();
const nextStatus = (state: State, text: string): Status => ({ text, id: (state.status?.id ?? 0) + 1 });

function initialState(): State {
  try {
    const dataset = loadSampleDataset();
    const quarters = newest(dataset.quarters.keys());
    return {
      dataset,
      indexes: new Map(quarters.map((q) => [q, indexQuarter(dataset.quarters.get(q)!)])),
      sources: new Map(quarters.map((q) => [q, SAMPLE_SOURCE])),
      selectedQuarter: quarters[0] ?? null,
      status: null,
    };
  } catch {
    return {
      dataset: { quarters: new Map(), targets: [] },
      indexes: new Map(),
      sources: new Map(),
      selectedQuarter: null,
      status: { text: 'The sample data could not be loaded. Load a quarter file to get started.', id: 1 },
    };
  }
}

// Memory only: nothing here is ever written to storage (REQ-13).
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'select':
      return state.dataset.quarters.has(action.quarter) ? { ...state, selectedQuarter: action.quarter } : state;
    case 'quarter': {
      const { quarter, ratings, rowCount } = action.result;
      const verb = state.dataset.quarters.has(quarter) ? 'Replaced' : 'Loaded';
      return {
        dataset: { ...state.dataset, quarters: new Map(state.dataset.quarters).set(quarter, ratings) },
        indexes: new Map(state.indexes).set(quarter, indexQuarter(ratings)),
        sources: new Map(state.sources).set(quarter, action.fileName),
        selectedQuarter: quarter,
        status: nextStatus(state, `${verb} ${quarter} from ${action.fileName} (${rowCount.toLocaleString('en')} rows).`),
      };
    }
    case 'targets': {
      const { targets } = action.result;
      return {
        ...state,
        dataset: { ...state.dataset, targets },
        status: nextStatus(state, `Loaded ${targets.length.toLocaleString('en')} targets from ${action.fileName}.`),
      };
    }
  }
}

const DataContext = createContext<Data | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const value = useMemo<Data>(
    () => ({
      ...state,
      quarters: newest(state.dataset.quarters.keys()),
      selectQuarter: (quarter) => dispatch({ type: 'select', quarter }),
      addQuarter: (result, fileName) => dispatch({ type: 'quarter', result, fileName }),
      setTargets: (result, fileName) => dispatch({ type: 'targets', result, fileName }),
    }),
    [state],
  );
  return <DataContext value={value}>{children}</DataContext>;
}

export function useData(): Data {
  const data = useContext(DataContext);
  if (!data) throw new Error('useData must be used inside DataProvider');
  return data;
}
