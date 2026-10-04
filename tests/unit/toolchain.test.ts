import { describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { commandFor, exitCodeFor, resolveTestFile } from '../../scripts/test-file.mjs';
import { evaluateAudit } from '../../scripts/audit-check.mjs';

const root = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(root, f), 'utf8');
const pkg = JSON.parse(read('package.json'));
const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures/audit', `${name}.json`), 'utf8');
const testFile = path.join(root, 'scripts/test-file.mjs');

function runTestFile(args: string[], cwd = root, env: Record<string, string> = { TEST_FILE_DRY_RUN: '1' }) {
  return spawnSync(process.execPath, [testFile, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
}
const dryRun = (arg: string, cwd = root) => JSON.parse(runTestFile([arg], cwd).stdout);

describe('S1 toolchain', () => {
  it('S1 AC-1: lock file and scripts support a clean-checkout install, test, build and e2e run', () => {
    const lock = JSON.parse(read('package-lock.json'));
    expect(lock.lockfileVersion).toBe(3);
    const lockRoot = lock.packages[''];
    expect(lockRoot.dependencies).toEqual(pkg.dependencies);
    expect(lockRoot.devDependencies).toEqual(pkg.devDependencies);
    for (const name of [...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)]) {
      expect(lock.packages[`node_modules/${name}`], name).toBeDefined();
    }
    for (const s of ['test', 'build', 'preview', 'test:e2e', 'test:file']) expect(pkg.scripts[s], s).toBeTruthy();
    expect(read('.nvmrc').trim()).toBe('22');
  });

  it('S1 AC-4: npm audit reports no high or critical vulnerabilities', () => {
    expect(evaluateAudit(fixture('clean')).ok).toBe(true);
    expect(evaluateAudit(fixture('moderate-only')).ok).toBe(true);
    expect(evaluateAudit(fixture('high'))).toMatchObject({ ok: false, message: expect.stringContaining('1 high') });
    expect(evaluateAudit(fixture('critical'))).toMatchObject({ ok: false, message: expect.stringContaining('1 critical') });
    expect(evaluateAudit(fixture('registry-error')).ok).toBe(false);
    expect(pkg.scripts.test).toMatch(/&& node scripts\/audit-check\.mjs$/);
  });

  it('S1 EC-1: equivalent spellings of a test path go to the same runner', () => {
    const e2e = path.join(root, 'tests/e2e/scaffold.spec.ts');
    for (const arg of ['tests/e2e/scaffold.spec.ts', './tests/e2e/scaffold.spec.ts', e2e, 'tests\\e2e\\scaffold.spec.ts']) {
      const cmd = dryRun(arg);
      expect(cmd.args[0], arg).toBe('playwright');
      expect(cmd.env.TEST_FILE, arg).toBe(e2e);
    }
    const unit = dryRun('tests/e2e/../unit/App.test.tsx');
    expect(unit.args[0]).toBe('vitest');
    expect(unit.env.TEST_FILE).toBe(path.join(root, 'tests/unit/App.test.tsx'));
  });

  it('S1 EC-2: audit check passes a moderate-only report and reports registry errors', () => {
    expect(evaluateAudit(fixture('moderate-only')).ok).toBe(true);
    const err = evaluateAudit(fixture('registry-error'));
    expect(err.ok).toBe(false);
    expect(err.message).toContain('ENOTFOUND registry.npmjs.org');
    expect(evaluateAudit('not json').ok).toBe(false);
  });

  it('S1 EC-3: test:file runs exactly one regular test file and rejects anything else', async () => {
    for (const args of [[], ['tests/unit'], ['src/App.tsx'], ['tests/unit/missing.test.ts'], ['tests/unit/App.test.tsx', 'tests/unit/toolchain.test.ts'], ['tests/unit/../../package.json'], ['tests/unit/a b.test.ts']]) {
      expect(runTestFile(args).status, JSON.stringify(args)).toBe(2);
    }
    const tmp = mkdtempSync(path.join(tmpdir(), 's1-ec3-'));
    mkdirSync(path.join(tmp, 'tests/unit'), { recursive: true });
    writeFileSync(path.join(tmp, 'tests/unit/csv.test.ts'), '');
    writeFileSync(path.join(tmp, 'tests/unit/csv.test.tsx'), '');
    expect(resolveTestFile(['tests/unit/csv.test.ts'], tmp)).toEqual({ rel: 'tests/unit/csv.test.ts' });
    const selected = dryRun('tests/unit/csv.test.ts', tmp).env.TEST_FILE;
    expect(selected).toBe(path.join(tmp, 'tests/unit/csv.test.ts'));

    vi.stubEnv('TEST_FILE', selected);
    vi.resetModules();
    const config = (await import('../../vite.config')).default as { test: { include: string[] } };
    vi.unstubAllEnvs();
    expect(config.test.include).toEqual([selected]);
  });

  it('S1 EC-4: a runner that fails to start or is killed exits non-zero', () => {
    expect(exitCodeFor({ error: new Error('spawn npx ENOENT'), status: null, signal: null })).toBe(1);
    expect(exitCodeFor({ status: null, signal: 'SIGKILL' })).toBe(1);
    expect(exitCodeFor({ status: 3, signal: null })).toBe(3);
    expect(exitCodeFor({ status: 0, signal: null })).toBe(0);
    expect(exitCodeFor({})).toBe(1);
    const run = runTestFile(['tests/unit/App.test.tsx'], root, { TEST_FILE_NPX: path.join(root, 'no-such-runner') });
    expect(run.status).not.toBe(0);
    expect(commandFor('tests/unit/App.test.tsx', root).args[0]).toBe('vitest');
  });

  it('S1 EC-6: unit tests run without the npm registry', () => {
    expect(pkg.scripts.test).toBe('vitest run && node scripts/audit-check.mjs');
    const files = readdirSync(__dirname, { recursive: true, encoding: 'utf8' }).filter((f) => /\.(ts|tsx)$/.test(f));
    for (const f of files) {
      expect(readFileSync(path.join(__dirname, f), 'utf8'), f).not.toMatch(/(spawn|exec)(Sync|File|FileSync)?\(\s*['"`]npm['"`]/);
    }
  });
});
