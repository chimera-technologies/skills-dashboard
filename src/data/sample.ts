import { validateQuarterFile, validateTargetFile } from './validate';
import type { Dataset } from './types';

// bundled at build time (no network, SEC-7.1)
const raw = import.meta.glob<string>('./sample/*.csv', { query: '?raw', import: 'default', eager: true });
export const SAMPLE_FILES: Record<string, string> = Object.fromEntries(
  Object.entries(raw).map(([p, text]) => [p.slice('./sample/'.length), text]),
);

export function loadSampleDataset(): Dataset {
  const dataset: Dataset = { quarters: new Map(), targets: [] };
  for (const [name, text] of Object.entries(SAMPLE_FILES).sort()) {
    const result = name === 'targets.csv' ? validateTargetFile(text) : validateQuarterFile(text);
    if (!result.ok) {
      const e = result.errors[0];
      throw new Error(`Sample file ${name} is invalid: row ${e.row}: ${e.reason}`);
    }
    if ('targets' in result) dataset.targets = result.targets;
    else dataset.quarters.set(result.quarter, result.ratings);
  }
  return dataset;
}
