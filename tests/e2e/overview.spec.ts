import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { guardOrigin } from './helpers/origin-guard';

// expected numbers from the bundled file with a plain loop (the sample has no quoted fields)
function expected(quarter: string) {
  const file = path.join(import.meta.dirname, '../../src/data/sample', `skills-${quarter}.csv`);
  const [head, ...lines] = readFileSync(file, 'utf8').trim().split(/\r?\n/);
  const cols = head.split(',');
  const rows = lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])));
  const sum = rows.reduce((s, r) => s + Number(r.level), 0);
  const distinct = (k: string) => String(new Set(rows.map((r) => r[k])).size);
  return { people: distinct('employee_id'), teams: distinct('team'), skills: distinct('skill'), average: (Math.round((sum * 10) / rows.length) / 10).toFixed(1) };
}

const statValue = (page: Page, label: string) => page.locator('.stat').filter({ has: page.locator('.stat-label', { hasText: label }) }).locator('.stat-value');
const cellTexts = (t: Locator) => t.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent!.trim())));
const categoryTable = (page: Page) => page.getByRole('table', { name: /^Average per category/ });

test('S5 AC-1: headline numbers match the sample data for the selected quarter', async ({ page }) => {
  await page.goto('/');
  for (const q of ['2026-Q3', '2025-Q4']) {
    await page.getByLabel('Quarter', { exact: true }).selectOption(q);
    const e = expected(q);
    await expect(statValue(page, 'People')).toHaveText(e.people);
    await expect(statValue(page, 'Teams')).toHaveText(e.teams);
    await expect(statValue(page, 'Skills assessed')).toHaveText(e.skills);
    await expect(statValue(page, 'Average level')).toHaveText(e.average);
  }
});

test('S5 AC-3: category change shows direction and difference in text', async ({ page, context, baseURL }) => {
  const guard = await guardOrigin(context, new URL(baseURL!).origin);
  await page.goto('/');
  const t = categoryTable(page);
  await expect(t).toBeVisible();
  const rows = await cellTexts(t);
  expect(rows.map((r) => r[0])).toEqual(['Cloud', 'Data', 'Development', 'Delivery', 'Leadership']);
  for (const [, now, before, change] of rows) {
    const diff = Math.round((Number(now) - Number(before)) * 10) / 10;
    const want = diff > 0 ? `▲ Up ${diff.toFixed(1)}` : diff < 0 ? `▼ Down ${(-diff).toFixed(1)}` : '● Unchanged';
    expect([want, 'Not enough data']).toContain(change);
  }

  // the download matches the visible rows (numbers as numbers, the bar column is not in the skill tables)
  const download = page.waitForEvent('download');
  await page.locator('.card').filter({ has: t }).getByRole('button', { name: /^Download CSV/ }).click();
  const d = await download;
  expect(d.suggestedFilename()).toBe('category-averages-2026-Q3.csv');
  const csv = readFileSync((await d.path())!, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/).map((l) => l.split(','));
  expect(csv[0]).toEqual(['Category', '2026-Q3', '2026-Q2', 'Change']);
  expect(csv.slice(1).map(([c, a, b, ch]) => [c, Number(a).toFixed(1), Number(b).toFixed(1), ch])).toEqual(rows);

  // a category link applies the filter, shown as a chip that Clear all removes
  await t.getByRole('link', { name: 'Data' }).click();
  const bar = page.getByRole('region', { name: 'Applied filters' });
  await expect(bar).toContainText('Category: Data');
  await expect(categoryTable(page).locator('tbody tr')).toHaveCount(1);
  await bar.getByRole('button', { name: 'Clear all' }).click();
  await expect(categoryTable(page).locator('tbody tr')).toHaveCount(5);
  await guard.settle(page);
  expect(guard.violations()).toEqual([]);
});

test('S5 AC-2: overview tables are reachable by keyboard and axe reports no violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('table', { name: /^Top 10 skills/ }).locator('tbody tr')).toHaveCount(10);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const wanted = new Set(['Download CSV (10 rows)', 'Download CSV (5 rows)', 'Cloud', 'Leadership']);
  const seen = new Set<string>();
  for (let i = 0; i < 60 && seen.size < wanted.size; i++) {
    await page.keyboard.press('Tab');
    const name = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
    if (wanted.has(name)) seen.add(name);
  }
  expect([...seen].sort()).toEqual([...wanted].sort());
});

test('S5 EC-4: at 1024x768 the page has no horizontal scroll and the three cards sit in two columns', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');
  const cards = page.locator('.card');
  await expect(cards).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
  const boxes = await cards.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map(({ x, y }) => ({ x, y })));
  expect(new Set(boxes.map((b) => Math.round(b.x))).size).toBe(2);
  expect(Math.round(boxes[2].x)).toBe(Math.round(boxes[0].x));
  expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
  // for comparing with designs/skills-dashboard-prototype/screens/overview.png (.screenshots/ is git-ignored)
  await page.screenshot({ path: '.screenshots/overview-1024.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: '.screenshots/overview-1280.png', fullPage: true });
});
