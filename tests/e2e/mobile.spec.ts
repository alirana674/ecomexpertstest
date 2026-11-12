import { expect, test } from '@playwright/test';

/** Mobile-only behavior (runs on the 483px project). */
test.skip(({ viewport }) => (viewport?.width ?? 0) >= 700, 'mobile only');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
});

test('starts with the heading visible and every step collapsed with counts', async ({
  page,
}) => {
  await expect(page.getByRole('heading', { name: /let’s get started!/i })).toBeVisible();
  for (const name of [
    /choose your cameras/i,
    /choose your plan/i,
    /choose your sensors/i,
    /add extra protection/i,
  ]) {
    await expect(page.getByRole('button', { name })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  }
  await expect(page.getByText('2 selected').first()).toBeVisible();
  await expect(page.getByText('Home Monitoring Plan')).toBeVisible();
});

test('expanding a step on mobile shows its cards and keeps state', async ({ page }) => {
  const cameras = page.getByRole('button', { name: /choose your cameras/i });
  await cameras.click();
  await expect(cameras).toHaveAttribute('aria-expanded', 'true');
  const v4 = page.getByRole('article', { name: 'Wyze Cam v4' });
  await v4.getByRole('button', { name: /increase quantity/i }).click();
  await expect(
    page.getByRole('region', { name: 'Your security system review' }).getByText('$55.96'),
  ).toBeVisible();
});

test('review item names render on a single line', async ({ page }) => {
  for (const name of [
    'Wyze Sense Motion Sensor',
    'Wyze Sense Hub (Required)',
    'Wyze MicroSD Card (256GB)',
  ]) {
    const el = page
      .getByRole('region', { name: 'Your security system review' })
      .getByText(name, { exact: true });
    const lines = await el.evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0);
      const tops = new Set(rects.map((r) => Math.round(r.top)));
      return tops.size;
    });
    expect(lines, `${name} should be one line`).toBe(1);
  }
});
