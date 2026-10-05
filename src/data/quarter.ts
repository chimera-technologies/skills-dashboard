export const QUARTER_RE = /^\d{4}-Q[1-4]$/;

export function previousQuarter(quarter: string): string {
  const year = Number(quarter.slice(0, 4));
  const q = Number(quarter.slice(6));
  return q === 1 ? `${year - 1}-Q4` : `${year}-Q${q - 1}`;
}

// 'YYYY-Qn' sorts correctly as a string
export const compareQuarters = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
