// Fails when npm audit reports high or critical vulnerabilities, or cannot reach the registry (SEC-5.1).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function evaluateAudit(stdout) {
  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    return { ok: false, message: `npm audit returned no JSON: ${String(stdout).slice(0, 200)}` };
  }
  const v = report?.metadata?.vulnerabilities;
  if (!v) {
    const e = report?.error ?? {};
    return { ok: false, message: `npm audit failed: ${e.summary ?? e.code ?? 'no vulnerability metadata'}` };
  }
  if ((v.high ?? 0) > 0 || (v.critical ?? 0) > 0) {
    return { ok: false, message: `npm audit: ${v.high ?? 0} high, ${v.critical ?? 0} critical vulnerabilities` };
  }
  return { ok: true, message: `npm audit: no high or critical vulnerabilities` };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = spawnSync('npm', ['audit', '--json', '--audit-level=high'], { encoding: 'utf8' });
  const verdict = evaluateAudit(result.stdout ?? '');
  (verdict.ok ? console.log : console.error)(verdict.message);
  process.exit(verdict.ok ? 0 : 1);
}
