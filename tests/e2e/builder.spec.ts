import { expect, test, type Page } from '@playwright/test';

/**
 * Builder-card interactions and accordion behavior. These assume the step
 * panels are visible as on desktop/tablet (step 1 expanded on load), so the
 * suite skips on the mobile project where every step starts collapsed —
 * mobile-specific behavior is covered in mobile.spec.ts.
 */
test.skip(({ viewport }) => (viewport?.width ?? 0) < 700, 'desktop/tablet only');

const card = (page: Page, name: string) => page.getByRole('article', { name });
const reviewPanel = (page: Page) =>
  page.getByRole('region', { name: 'Your security system review' });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
});

test('every camera can be added and removed from its card', async ({ page }) => {
  const cameras = [
    'Wyze Cam Floodlight v2',
    'Wyze Duo Cam Doorbell',
    'Wyze Battery Cam Pro',
  ];
  for (const name of cameras) {
    const c = card(page, name);
    await c.getByRole('button', { name: /increase quantity/i }).click();
    await expect(c.getByRole('group').getByText('1', { exact: true })).toBeVisible();
    await expect(reviewPanel(page).getByText(name)).toBeVisible();
    await c.getByRole('button', { name: /decrease quantity/i }).click();
    await expect(reviewPanel(page).getByText(name)).toBeHidden();
  }
});

test('variants keep independent quantities and both appear in the review', async ({
  page,
}) => {
  const v4 = card(page, 'Wyze Cam v4');
  const stepperValue = v4.getByRole('group').locator('span').first();

  // White seeded at 1 → bump to 2.
  await v4.getByRole('button', { name: /increase quantity/i }).click();
  await expect(stepperValue).toHaveText('2');

  // Switch to Black: stepper shows Black's own quantity (0), White untouched.
  await v4.getByRole('radio', { name: 'Black' }).click();
  await expect(stepperValue).toHaveText('0');
  await v4.getByRole('button', { name: /increase quantity/i }).click();
  await expect(stepperValue).toHaveText('1');

  const panel = reviewPanel(page);
  await expect(panel.getByText('Wyze Cam v4 – White')).toBeVisible();
  await expect(panel.getByText('Wyze Cam v4 – Black')).toBeVisible();
  await expect(panel.getByText('$55.96')).toBeVisible(); // white ×2
  await expect(panel.getByText('$27.98')).toBeVisible(); // black ×1

  // Switching back restores White's quantity — nothing was moved or reset.
  await v4.getByRole('radio', { name: 'White' }).click();
  await expect(stepperValue).toHaveText('2');

  // Distinct-product count: still 2 cameras despite 3 selected lines.
  await expect(
    page.getByRole('button', { name: /choose your cameras/i }).getByText('2 selected'),
  ).toBeVisible();
});

test('review panel steppers drive the card of the matching variant', async ({ page }) => {
  const panel = reviewPanel(page);
  await panel
    .getByRole('button', { name: /decrease quantity of wyze cam pan v3/i })
    .click();
  const pan = card(page, 'Wyze Cam Pan v3');
  await expect(pan.getByRole('group').locator('span').first()).toHaveText('1');
});

test('accordion: single expansion, toggle, next, and selections preserved', async ({
  page,
}) => {
  // Anchored: header names include count/chevron text; "Next: …" must not match.
  const cameras = page.getByRole('button', { name: /^choose your cameras/i });
  const plan = page.getByRole('button', { name: /^choose your plan/i });
  const sensors = page.getByRole('button', { name: /^choose your sensors/i });

  await expect(cameras).toHaveAttribute('aria-expanded', 'true');

  // Next advances and collapses the previous step.
  await page.getByRole('button', { name: 'Next: Choose your plan' }).click();
  await expect(cameras).toHaveAttribute('aria-expanded', 'false');
  await expect(plan).toHaveAttribute('aria-expanded', 'true');

  // The plan step shows the single plan as selected (single-select mode).
  await expect(
    card(page, 'Cam Unlimited').getByRole('button', { name: 'Selected' }),
  ).toBeVisible();

  // Clicking another collapsed step switches expansion.
  await sensors.click();
  await expect(plan).toHaveAttribute('aria-expanded', 'false');
  await expect(sensors).toHaveAttribute('aria-expanded', 'true');

  // Clicking the active step collapses it (none expanded).
  await sensors.click();
  await expect(sensors).toHaveAttribute('aria-expanded', 'false');

  // Keyboard: focus + Enter expands again.
  await cameras.focus();
  await page.keyboard.press('Enter');
  await expect(cameras).toHaveAttribute('aria-expanded', 'true');

  // Selections survived all the navigation.
  await expect(reviewPanel(page).getByText('$187.89')).toBeVisible();
});

test('sense hub card stepper is clamped at its minimum inside the sensors step', async ({
  page,
}) => {
  await page.getByRole('button', { name: /^choose your sensors/i }).click();
  const hub = card(page, 'Wyze Sense Hub');
  await expect(hub.getByRole('button', { name: /decrease quantity/i })).toBeDisabled();
  // Can increase, then decrease back to the minimum — but not below.
  await hub.getByRole('button', { name: /increase quantity/i }).click();
  await hub.getByRole('button', { name: /decrease quantity/i }).click();
  await expect(hub.getByRole('button', { name: /decrease quantity/i })).toBeDisabled();
});
