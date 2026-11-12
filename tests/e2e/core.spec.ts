import { expect, test, type Page } from '@playwright/test';

/**
 * Core journeys that must hold at every configured viewport
 * (desktop 1439 / tablet 928 / mobile 483 — see playwright.config.ts).
 */

const reviewPanel = (page: Page) =>
  page.getByRole('region', { name: 'Your security system review' });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
});

test('loads with the seeded reference state and derived totals', async ({ page }) => {
  const panel = reviewPanel(page);
  await expect(panel.getByText('Wyze Cam v4')).toBeVisible();
  await expect(panel.getByText('Wyze Cam Pan v3')).toBeVisible();
  await expect(panel.getByText('Wyze Sense Hub (Required)')).toBeVisible();
  // Derived totals must reproduce the reference values.
  await expect(panel.getByText('$187.89')).toBeVisible();
  await expect(panel.getByText('$238.81')).toBeVisible();
  await expect(panel.getByText(/saving \$50\.92/)).toBeVisible();
  // Line totals (unit × qty): Pan v3 ×2.
  await expect(panel.getByText('$47.98')).toBeVisible();
});

test('renders without console errors or failed local requests', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  const failed: string[] = [];
  page.on('response', (res) => {
    if (res.status() >= 400 && res.url().includes('localhost')) failed.push(res.url());
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test('has no horizontal overflow and no broken images', async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.src),
  );
  expect(broken).toEqual([]);
});

test('no horizontal overflow at 390px (small mobile)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1600 });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test('review stepper changes update quantities and totals from any viewport', async ({
  page,
}) => {
  const panel = reviewPanel(page);
  await panel.getByRole('button', { name: /increase quantity of wyze microsd/i }).click();
  await expect(panel.getByText('$62.94')).toBeVisible(); // 3 × $20.98
  await expect(panel.getByText('$208.87')).toBeVisible(); // 187.89 + 20.98
});

test('required Sense Hub cannot go below its minimum from the review panel', async ({
  page,
}) => {
  const decrease = reviewPanel(page).getByRole('button', {
    name: /decrease quantity of wyze sense hub/i,
  });
  await expect(decrease).toBeDisabled();
});

test('save → reload restores the exact configuration', async ({ page }) => {
  const panel = reviewPanel(page);
  await panel.getByRole('button', { name: /increase quantity of wyze cam v4/i }).click();
  await expect(panel.getByText('$55.96')).toBeVisible(); // 2 × 27.98

  await page.getByRole('button', { name: /save my system for later/i }).click();
  await expect(page.getByText(/saved for later/i)).toBeVisible();

  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await expect(reviewPanel(page).getByText('$55.96')).toBeVisible();
  await expect(reviewPanel(page).getByText('$215.87')).toBeVisible();

  // Re-save with a different configuration; the LATEST save must win.
  await reviewPanel(page)
    .getByRole('button', { name: /decrease quantity of wyze cam v4/i })
    .click();
  await page.getByRole('button', { name: /save my system for later/i }).click();
  await page.reload();
  await expect(reviewPanel(page).getByText('$187.89')).toBeVisible();
});

test('corrupted and incompatible stored data fall back to defaults without crashing', async ({
  page,
}) => {
  await page.evaluate(() =>
    localStorage.setItem('wyze-bundle-builder:saved-system', '{broken json!!'),
  );
  await page.reload();
  await expect(reviewPanel(page).getByText('$187.89')).toBeVisible();

  await page.evaluate(() =>
    localStorage.setItem(
      'wyze-bundle-builder:saved-system',
      JSON.stringify({
        version: 999,
        quantities: { 'wyze-cam-v4:white': 5 },
        activeVariant: {},
      }),
    ),
  );
  await page.reload();
  await expect(reviewPanel(page).getByText('$187.89')).toBeVisible();

  // Unknown product ids are dropped; required hub is re-enforced.
  await page.evaluate(() =>
    localStorage.setItem(
      'wyze-bundle-builder:saved-system',
      JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        quantities: { 'discontinued-cam': 3, 'wyze-cam-v4:white': 1 },
        activeVariant: {},
      }),
    ),
  );
  await page.reload();
  const panel = reviewPanel(page);
  await expect(panel.getByText('Wyze Sense Hub (Required)')).toBeVisible();
  await expect(panel.getByText('Wyze Cam v4')).toBeVisible();
  // v4 line total and (plan-less) grand total are both $27.98 in this
  // synthetic restore, so assert on the first match.
  await expect(panel.getByText('$27.98').first()).toBeVisible();
});

test('checkout opens a confirmation dialog with the derived total', async ({ page }) => {
  await page.getByRole('button', { name: 'Checkout' }).click();
  const dialog = page.getByRole('dialog', { name: 'Checkout' });
  await expect(dialog.getByText('$187.89')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
