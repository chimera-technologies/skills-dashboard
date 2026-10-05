export type Rating = {
  employeeId: string;
  name: string;
  team: string;
  role: string;
  skill: string;
  category: string;
  level: number;
  quarter: string;
};

export type Target = { team: string; skill: string; targetLevel: number };

// row is the spreadsheet row (header = 1); column is null for whole-row problems
export type RowError = { row: number; column: string | null; reason: string };

type Failed = { ok: false; errors: RowError[]; rowCount: number; badRowCount: number };

export type QuarterFileResult = { ok: true; quarter: string; ratings: Rating[]; rowCount: number } | Failed;

export type TargetFileResult = { ok: true; targets: Target[]; rowCount: number } | Failed;

export type Dataset = { quarters: Map<string, Rating[]>; targets: Target[] };

export type Reference = {
  teams: Set<string>;
  skills: Map<string, string>; // skill -> category
  categories: Set<string>;
};
