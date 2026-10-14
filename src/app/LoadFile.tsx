import { useCallback, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { validateQuarterFile, validateTargetFile } from '../data/validate';
import LoadErrorsDialog, { type FailedLoad } from './LoadErrorsDialog';
import { readCsvFile } from './readFile';
import { useData } from './store';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

type Kind = 'quarter' | 'target';
const LABELS: Record<Kind, [button: string, input: string]> = {
  quarter: ['Load quarter file', 'Quarter file'],
  target: ['Load target file', 'Target file'],
};

const fileProblem = (reason: string): FailedLoad => ({ ok: false, errors: [{ row: 1, column: null, reason }], rowCount: 0, badRowCount: 1 });

// The file is read in this tab only: never uploaded, stored or logged (REQ-13).
export default function LoadFile() {
  const { addQuarter, setTargets } = useData();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ fileName: string; result: FailedLoad } | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const inputs = { quarter: useRef<HTMLInputElement>(null), target: useRef<HTMLInputElement>(null) };

  const open = (kind: Kind, e: MouseEvent<HTMLButtonElement>) => {
    opener.current = e.currentTarget;
    inputs[kind].current!.click();
  };

  async function load(kind: Kind, e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    let failed: FailedLoad | null = null;
    try {
      if (!/\.csv$/i.test(file.name)) failed = fileProblem('Only .csv files can be loaded.');
      else if (file.size > MAX_FILE_BYTES) failed = fileProblem('The file is larger than 5 MB.');
      else {
        const read = await readCsvFile(file);
        if (!read.ok) failed = fileProblem(read.reason);
        else if (kind === 'quarter') {
          const result = validateQuarterFile(read.text);
          if (result.ok) addQuarter(result, file.name);
          else failed = result;
        } else {
          const result = validateTargetFile(read.text);
          if (result.ok) setTargets(result, file.name);
          else failed = result;
        }
      }
    } catch {
      failed = fileProblem('The file could not be read. Check it still exists and try again.');
    } finally {
      input.value = '';
      // one update: buttons are enabled again before the dialog opens, so focus can return to them
      setBusy(false);
      if (failed) setProblem({ fileName: file.name, result: failed });
    }
  }

  const onClose = useCallback(() => {
    setProblem(null);
    opener.current?.focus();
  }, []);

  return (
    <>
      {(['quarter', 'target'] as const).map((kind) => (
        <span key={kind} className="load-file">
          <button type="button" className="btn" disabled={busy} onClick={(e) => open(kind, e)}>
            {LABELS[kind][0]}
          </button>
          <input
            ref={inputs[kind]}
            type="file"
            accept=".csv,text/csv"
            hidden
            tabIndex={-1}
            aria-label={LABELS[kind][1]}
            onChange={(e) => load(kind, e)}
          />
        </span>
      ))}
      {problem && <LoadErrorsDialog fileName={problem.fileName} result={problem.result} onClose={onClose} />}
    </>
  );
}
