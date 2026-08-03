import { test, expect, type Page } from '@playwright/test';

/**
 * Locale comes from the project name (`mobile-fr` / `mobile-ar`) so each locale
 * is a separate run rather than a loop inside one test — a failure then names
 * the locale that broke.
 */
function localeFor(projectName: string): 'fr' | 'ar' {
  return projectName.endsWith('-ar') ? 'ar' : 'fr';
}

const panelOf = (page: Page) => page.locator('#mobile-menu');
const triggerOf = (page: Page) => page.locator('[aria-controls="mobile-menu"]');

test.beforeEach(async ({ page }, testInfo) => {
  await page.goto(`/${localeFor(testInfo.project.name)}`, { waitUntil: 'networkidle' });
});

test('renders at a phone viewport with the hamburger shown', async ({ page }) => {
  // Guards the premise of every other test: above `lg` the panel is
  // display:none and the focus assertions would pass vacuously.
  expect(await page.evaluate(() => window.innerWidth)).toBeLessThanOrEqual(430);
  await expect(triggerOf(page)).toBeVisible();
});

test('hamburger and close button meet the 44px touch target', async ({ page }) => {
  const trigger = await triggerOf(page).boundingBox();
  expect(trigger?.width).toBeGreaterThanOrEqual(44);
  expect(trigger?.height).toBeGreaterThanOrEqual(44);

  await triggerOf(page).tap();
  const close = await panelOf(page).getByRole('button').first().boundingBox();
  expect(close?.width).toBeGreaterThanOrEqual(44);
  expect(close?.height).toBeGreaterThanOrEqual(44);
});

test('closed panel is inert and unreachable by keyboard', async ({ page }) => {
  const panel = panelOf(page);
  await expect(panel).toHaveJSProperty('inert', true);

  // The regression this guards: `opacity-0 pointer-events-none` hides the panel
  // visually but leaves every link in the tab order. Only `inert` removes them.
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const inside = await panel.evaluate((el) => el.contains(document.activeElement));
    expect(inside, `focus leaked into the closed panel on Tab #${i + 1}`).toBe(false);
  }
});

test('opening moves focus into the panel', async ({ page }) => {
  await triggerOf(page).tap();
  const panel = panelOf(page);
  await expect(panel).toHaveJSProperty('inert', false);
  await expect.poll(() => panel.evaluate((el) => el.contains(document.activeElement))).toBe(true);
});

test('Tab and Shift+Tab stay trapped inside the open panel', async ({ page }) => {
  await triggerOf(page).tap();
  const panel = panelOf(page);

  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const inside = await panel.evaluate((el) => el.contains(document.activeElement));
    expect(inside, `focus escaped the trap on Tab #${i + 1}`).toBe(true);
  }

  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Shift+Tab');
    const inside = await panel.evaluate((el) => el.contains(document.activeElement));
    expect(inside, `focus escaped the trap on Shift+Tab #${i + 1}`).toBe(true);
  }
});

test('Escape closes, re-inerts, and restores focus to the trigger', async ({ page }) => {
  await triggerOf(page).tap();
  await expect(panelOf(page)).toHaveJSProperty('inert', false);

  await page.keyboard.press('Escape');

  await expect(panelOf(page)).toHaveJSProperty('inert', true);
  await expect
    .poll(() =>
      page.evaluate(() => document.activeElement?.getAttribute('aria-controls') === 'mobile-menu'),
    )
    .toBe(true);
});

test('page does not scroll horizontally', async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
