import { useEffect, useMemo, useRef, useState } from 'react';
import type { QuarterFileResult, RowError } from '../data/types';
import { downloadCsv } from './download';

export type FailedLoad = Extract<QuarterFileResult, { ok: false }>;

export type ErrorSummary =
  | { kind: 'file'; reasons: string[] }
  | { kind: 'rows'; rowCount: number; headerReasons: string[]; rows: { row: number; errors: RowError[] }[] };

const FIRST_ROWS = 500;
const MORE_ROWS = 2000; // per animation frame, so a huge list never blocks the dialog from opening

const isHeaderError = (e: RowError) => /^(Missing|Duplicate) column/.test(e.reason);
const count = (n: number, one: string, many: string) => `${n.toLocaleString('en')} ${n === 1 ? one : many}`;

// File-level when nothing could be read as data rows, or only the header is wrong; otherwise one entry per bad row.
export function summariseErrors(result: FailedLoad): ErrorSummary {
  const header = result.errors.filter(isHeaderError);
  const data = result.errors.filter((e) => !isHeaderError(e));
  if (result.rowCount === 0 || data.length === 0) return { kind: 'file', reasons: result.errors.map((e) => e.reason) };
  const byRow = new Map<number, RowError[]>();
  for (const e of data) {
    const list = byRow.get(e.row);
    if (list) list.push(e);
    else byRow.set(e.row, [e]);
  }
  return {
    kind: 'rows',
    rowCount: result.rowCount,
    headerReasons: header.map((e) => e.reason),
    rows: [...byRow].map(([row, errors]) => ({ row, errors })),
  };
}

type Props = { fileName: string; result: FailedLoad; onClose: () => void };

// Messages carry only row, column and reason from the validator, never a person's name (SEC-2.3).
export default function LoadErrorsDialog({ fileName, result, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const summary = useMemo(() => summariseErrors(result), [result]);
  const total = summary.kind === 'rows' ? summary.rows.length : 0;
  const [shown, setShown] = useState(FIRST_ROWS);

  useEffect(() => {
    const d = dialog.current!;
    if (!d.open) d.showModal();
    close.current!.focus();
  }, []);

  useEffect(() => {
    const d = dialog.current!;
    d.addEventListener('close', onClose);
    return () => d.removeEventListener('close', onClose);
  }, [onClose]);

  useEffect(() => {
    if (shown >= total) return;
    const frame = requestAnimationFrame(() => setShown((s) => s + MORE_ROWS));
    return () => cancelAnimationFrame(frame);
  }, [shown, total]);

  const downloadProblems = () =>
    downloadCsv(`${fileName.replace(/\.csv$/i, '')}-problems.csv`, [
      ['Row', 'Column', 'Reason'],
      ...result.errors.map((e) => [e.row, e.column, e.reason]),
    ]);

  return (
    <dialog ref={dialog} className="load-errors" aria-labelledby="load-errors-title" aria-describedby="load-errors-desc">
      <div className="dlg-head">
        <span className="icon" aria-hidden="true">!</span>
        <div>
          <h2 id="load-errors-title">{fileName} was not loaded</h2>
          <p id="load-errors-desc">
            {summary.kind === 'rows'
              ? `${count(total, 'row has', 'rows have')} problems. Nothing was loaded and the data on screen has not changed. Fix the rows in the file and load it again.`
              : 'Nothing was loaded and the data on screen has not changed. Fix the file and load it again.'}
          </p>
        </div>
      </div>
      <div className="dlg-body">
        {summary.kind === 'file' ? (
          <ul className="reasons">
            {summary.reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        ) : (
          <>
            <div className="summary">
              <strong>File checked:</strong> {count(summary.rowCount, 'row', 'rows')} · {count(total, 'row', 'rows')} with problems · file kept
              in this browser only, not uploaded or saved
            </div>
            {summary.headerReasons.length > 0 && (
              <>
                <h3>Problems with the columns</h3>
                <ul className="reasons">
                  {summary.headerReasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </>
            )}
            <div className="list" tabIndex={0} role="group" aria-label="Rows with problems">
              <table>
                <caption>Rows with problems</caption>
                <thead>
                  <tr>
                    <th scope="col" className="num">Row</th>
                    <th scope="col">Column</th>
                    <th scope="col">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.slice(0, shown).map(({ row, errors }) => (
                    <tr key={row}>
                      <td className="num">{row.toLocaleString('en')}</td>
                      <td className="column-name">{errors.map((e) => e.column ?? '—').join('\n')}</td>
                      <td className="lines">{errors.map((e) => e.reason).join('\n')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {shown < total && <p className="muted">Listing {shown.toLocaleString('en')} of {total.toLocaleString('en')} rows…</p>}
          </>
        )}
      </div>
      <div className="dlg-foot">
        <span className="muted">Messages give the row number and reason, never the person's name.</span>
        <button type="button" className="btn" onClick={downloadProblems}>
          Download problem list (CSV)
        </button>
        <button type="button" className="btn btn-primary" ref={close} onClick={() => dialog.current!.close()}>
          Close
        </button>
      </div>
    </dialog>
  );
}
