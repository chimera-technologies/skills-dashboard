import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { guardOrigin } from './helpers/origin-guard';

const root = path.resolve(import.meta.dirname, '../..');
const dist = path.join(root, 'dist/index.html');

test('S1 AC-2: built dist is served by vite preview with the app title', async ({ page }) => {
  const html = readFileSync(dist, 'utf8');
  expect(html).toMatch(/(src|href)="\.\/assets\//);
  expect(html).not.toMatch(/(src|href)="\/assets\//);
  await page.goto('/');
  await expect(page).toHaveTitle('Skills dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'Skills dashboard' })).toBeVisible();
});

test('S1 AC-3: built app requests only its own origin', async ({ page, context, baseURL }) => {
  const guard = await guardOrigin(context, new URL(baseURL!).origin);
  await page.goto('/');
  await guard.settle(page);
  expect(guard.violations()).toEqual([]);
});

test('S1 BUG-1: origin guard catches late fetches, WebSockets and worker requests to other hosts', async ({ page, context, baseURL }) => {
  const guard = await guardOrigin(context, new URL(baseURL!).origin);
  await page.addInitScript(() => {
    window.addEventListener('load', () => {
      new WebSocket('wss://example.invalid/');
      const src = "fetch('https://example.invalid/w').catch(() => {})";
      new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      setTimeout(() => fetch('https://example.invalid/late').catch(() => {}), 1000);
    });
  });
  await page.goto('/');
  await guard.settle(page);
  const found = guard.violations();
  for (const url of ['wss://example.invalid/', 'https://example.invalid/w', 'https://example.invalid/late']) {
    expect(found, url).toContain(url);
  }
});

test('S1 EC-5: e2e runs against a fresh build', () => {
  const built = statSync(dist).mtimeMs;
  const sources = [path.join(root, 'index.html'), ...readdirSync(path.join(root, 'src'), { recursive: true, encoding: 'utf8' }).map((f) => path.join(root, 'src', f))];
  for (const f of sources) expect(statSync(f).mtimeMs, f).toBeLessThanOrEqual(built);
});

test('S1 harness: axe-core finds no violations on the shell', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
