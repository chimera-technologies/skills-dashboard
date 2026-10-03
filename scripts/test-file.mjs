// Runs one test file with the right runner: Playwright under tests/e2e/, Vitest under tests/unit/.
// Usage: npm run test:file -- <file>
import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const usage = 'usage: npm run test:file -- <tests/unit/... or tests/e2e/... file>';

export function resolveTestFile(args, cwd) {
  if (args.length !== 1) return { error: usage, code: 2 };
  const rel = path.relative(cwd, path.resolve(cwd, args[0].replaceAll('\\', '/'))).split(path.sep).join('/');
  if (!/^[A-Za-z0-9._/-]+$/.test(rel)) return { error: `unsafe characters in path: ${args[0]}`, code: 2 };
  if (!rel.startsWith('tests/unit/') && !rel.startsWith('tests/e2e/')) {
    return { error: `not under tests/unit/ or tests/e2e/: ${args[0]}\n${usage}`, code: 2 };
  }
  let isFile = false;
  try {
    isFile = statSync(path.join(cwd, rel)).isFile();
  } catch {}
  if (!isFile) return { error: `not a test file: ${args[0]}`, code: 2 };
  return { rel };
}

export function commandFor(rel, cwd = process.cwd()) {
  const runner = rel.startsWith('tests/e2e/') ? ['playwright', 'test', '--reporter=line'] : ['vitest', 'run'];
  return { bin: process.env.TEST_FILE_NPX ?? 'npx', args: runner, env: { TEST_FILE: path.resolve(cwd, rel) } };
}

export function exitCodeFor(result) {
  if (result.error) {
    console.error(String(result.error.message ?? result.error));
    return 1;
  }
  if (result.signal) return 1;
  return typeof result.status === 'number' ? result.status : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const resolved = resolveTestFile(process.argv.slice(2), process.cwd());
  if (resolved.error) {
    console.error(resolved.error);
    process.exit(resolved.code);
  }
  const cmd = commandFor(resolved.rel);
  if (process.env.TEST_FILE_DRY_RUN === '1') {
    console.log(JSON.stringify(cmd));
    process.exit(0);
  }
  const result = spawnSync(cmd.bin, cmd.args, { stdio: 'inherit', env: { ...process.env, ...cmd.env } });
  process.exit(exitCodeFor(result));
}
