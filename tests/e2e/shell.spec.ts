import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';
import { guardOrigin } from './helpers/origin-guard';

const fixture = (name: string) => path.join(import.meta.dirname, 'fixtures', name);
const BAD_ROWS = [
  ['3', 'level', 'Level must be a whole number from 1 to 5 (found "3.5")'],
  ['4', 'skill', 'Unknown skill (not in the list of 40 skills)'],
  ['5', 'team', 'Unknown team (not in the list of 12 teams)'],
  ['6', 'quarter', 'Mixed quarters: this row is 2026-Q3, the file is 2026-Q4'],
  ['7', 'employee_id', 'Missing required value'],
  ['8', '—', 'Duplicate row: same employee, skill and quarter as row 2'],
];
const FIXTURE_NAMES = ['Ada Fictional', 'Ben Example', 'Cleo Sample', 'Dev Placeholder', 'Eve Madeup', 'Fay Invented'];
const SAMPLE_OPTIONS = ['2026-Q3 (latest)', '2026-Q2', '2026-Q1', '2025-Q4'];

const options = (page: Page) => page.getByLabel('Quarter', { exact: true }).locator('option').allTextContents();
const hash = (page: Page) => new URL(page.url()).hash;
const noAxeViolations = async (page: Page) => expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

async function openBadFile(page: Page, button: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: button }).click();
  await (await chooser).setFiles(fixture('bad-skills-2026-Q4.csv'));
  return page.getByRole('dialog', { name: 'bad-skills-2026-Q4.csv was not loaded' });
}

test('S4 AC-2: applied filters are shown and Clear all removes them in one action', async ({ page }) => {
  await page.goto('/#/skills?team=Data%20Platform&team=Payments&role=Senior%20engineer');
  const bar = page.getByRole('region', { name: 'Applied filters' });
  await expect(bar).toContainText('Team: Data Platform, Payments');
  await expect(bar).toContainText('Role: Senior engineer');
  const before = await page.evaluate(() => history.length);
  await bar.getByRole('button', { name: 'Clear all' }).click();
  await expect(bar).toContainText('No filters applied');
  await expect(bar.getByRole('button')).toHaveCount(0);
  expect(hash(page)).toBe('#/skills');
  expect(await page.evaluate(() => history.length)).toBe(before + 1);

  await page.goBack();
  await expect(bar).toContainText('Role: Senior engineer');
  await bar.getByRole('button', { name: 'Remove filter Role: Senior engineer' }).click();
  await expect(bar).not.toContainText('Role:');
  await expect(bar).toContainText('Team: Data Platform, Payments');
  expect(hash(page)).toBe('#/skills?team=Data%20Platform&team=Payments');
  await bar.getByRole('button', { name: 'Remove filter Team: Data Platform, Payments' }).click();
  await expect(bar).toContainText('No filters applied');
});

test('S4 AC-4: a bad file shows every bad row, leaves the data unchanged and storage empty', async ({ page, context, baseURL }) => {
  const guard = await guardOrigin(context, new URL(baseURL!).origin);
  await page.goto('/');
  await guard.settle(page);
  const before = await options(page);
  expect(before).toEqual(SAMPLE_OPTIONS);
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));

  const dialog = await openBadFile(page, 'Load quarter file');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('6 rows have problems. Nothing was loaded and the data on screen has not changed.');
  await expect(dialog).toContainText('File checked: 8 rows · 6 rows with problems');
  const rows = await dialog.locator('tbody tr').evaluateAll((trs) =>
    trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent)),
  );
  expect(rows).toEqual(BAD_ROWS);
  const text = (await dialog.textContent())!;
  for (const name of FIXTURE_NAMES) expect(text).not.toContain(name);
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();

  expect(await options(page)).toEqual(before);
  await expect(page.getByLabel('Quarter', { exact: true })).toHaveValue('2026-Q3');
  const stored = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    idb: (await indexedDB.databases()).length,
    caches: (await caches.keys()).length,
    cookie: document.cookie,
  }));
  expect(stored).toEqual({ local: 0, session: 0, idb: 0, caches: 0, cookie: '' });
  expect(requests).toEqual([]);
  await guard.settle(page);
  expect(guard.violations()).toEqual([]);
});

test('S4 AC-5: all controls work by keyboard and axe-core reports no violations', async ({ page }) => {
  // keeps file-chooser interception on, so a fast Enter cannot race it and open a native chooser
  page.on('filechooser', () => {});
  await page.goto('/#/skills?team=Payments');
  await expect(page.getByLabel('Quarter', { exact: true })).toHaveValue('2026-Q3');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
  expect(await page.getByRole('banner').evaluate((e) => e.getBoundingClientRect().height)).toBe(56); // one line

  // Tab order reaches every shell control, each with the focus ring
  const wanted = ['Overview', 'Team', 'Skill search', 'Quarter', 'Load quarter file', 'Load target file', 'Remove filter Team: Payments', 'Clear all'];
  const seen: string[] = [];
  for (let i = 0; i < 20 && seen.length < wanted.length; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      const name = el.getAttribute('aria-label') ?? (el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : null) ?? el.textContent;
      return { name: name?.trim(), outline: `${style.outlineStyle} ${style.outlineWidth}` };
    });
    if (focused.name && wanted.includes(focused.name)) {
      expect(focused.outline, focused.name).toBe('solid 3px');
      seen.push(focused.name);
    }
  }
  expect(seen).toEqual(wanted);

  await page.getByRole('link', { name: 'Team' }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => hash(page)).toBe('#/team');
  await expect(page.getByRole('link', { name: 'Team' })).toHaveAttribute('aria-current', 'page');

  await page.getByLabel('Quarter', { exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByLabel('Quarter', { exact: true })).toHaveValue('2026-Q2');
  await page.keyboard.press('ArrowUp');
  await expect(page.getByLabel('Quarter', { exact: true })).toHaveValue('2026-Q3');

  // Enter opens the chooser; the dialog traps focus, Esc closes it, focus returns (twice, EC-2)
  for (let round = 0; round < 2; round++) {
    const load = page.getByRole('button', { name: 'Load quarter file' });
    await load.focus();
    const chooser = page.waitForEvent('filechooser');
    await page.keyboard.press('Enter');
    await (await chooser).setFiles(fixture('bad-skills-2026-Q4.csv'));
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Download problem list (CSV)' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
    if (round === 0) await noAxeViolations(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(load).toBeFocused();
  }

  for (const route of ['/#/', '/#/team', '/#/skills?team=Data%20Platform&role=Senior%20engineer', '/#/person/E0001', '/#/nowhere']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    await noAxeViolations(page);
  }
});

test('S4 EC-6: many long filter chips wrap without horizontal scroll at 1024 px and stay clickable', async ({ page }) => {
  const teams = ['Data Platform', 'Payments', 'Analytics', 'Cloud Operations', 'Web Apps'];
  const role = 'R'.repeat(200);
  const query = [...teams.map((t) => `team=${encodeURIComponent(t)}`), `role=${role}`, 'category=Cloud'].join('&');
  await page.goto(`/#/skills?${query}`);
  const bar = page.getByRole('region', { name: 'Applied filters' });
  await expect(bar).toContainText(`Team: ${teams.join(', ')}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
  const box = (await bar.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(1024);
  await bar.getByRole('button', { name: `Remove filter Role: ${role}` }).click();
  await expect(bar).not.toContainText('Role:');
  await bar.getByRole('button', { name: 'Clear all' }).click();
  await expect(bar).toContainText('No filters applied');
});
