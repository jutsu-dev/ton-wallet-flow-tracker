import { test, expect, type Page } from '@playwright/test';
import { loginAndLand } from './helpers';

const SIZES = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1366, height: 900 },
] as const;

/** The page must never scroll sideways: wide content scrolls inside its own box. */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test.describe('responsive layout', () => {
  test('dashboard and docs fit every width without horizontal overflow', async ({ page }) => {
    await loginAndLand(page, 'e2e-owner', 'E2e-Owner-Pass-1');

    for (const size of SIZES) {
      await page.setViewportSize({ width: size.width, height: size.height });

      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Схема переводов TON-адреса' })).toBeVisible();
      expect(await horizontalOverflow(page), `dashboard overflows at ${size.name}`).toBeLessThanOrEqual(0);
      // The analyze form is the point of the page: it must not be pushed off-screen
      // by the hero on a phone.
      const form = page.getByLabel('TON-адрес или .ton имя');
      await expect(form).toBeVisible();
      const box = await form.boundingBox();
      expect(box, `analyze input missing at ${size.name}`).not.toBeNull();
      expect(box!.y, `analyze input below the fold at ${size.name}`).toBeLessThan(size.height);

      await page.goto('/docs');
      await expect(page.getByRole('heading', { name: 'Документация', level: 1 })).toBeVisible();
      expect(await horizontalOverflow(page), `docs overflows at ${size.name}`).toBeLessThanOrEqual(0);
    }
  });

  test('login page fits every width', async ({ page }) => {
    for (const size of SIZES) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto('/login');
      await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();
      expect(await horizontalOverflow(page), `login overflows at ${size.name}`).toBeLessThanOrEqual(0);
    }
  });

  test('the analyze form is operable by keyboard alone', async ({ page }) => {
    await loginAndLand(page, 'e2e-owner', 'E2e-Owner-Pass-1');

    // Reach the address field by tabbing, then drive the form with the keyboard only.
    const address = page.getByLabel('TON-адрес или .ton имя');
    await address.focus();
    await expect(address).toBeFocused();
    await page.keyboard.type('EQDemoWallet');

    await page.keyboard.press('Tab'); // limit
    await page.keyboard.press('Tab'); // depth
    await page.keyboard.press('Tab'); // submit
    await expect(page.getByRole('button', { name: 'Построить схему' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/wallet\//);
  });

  test('focus is visible when tabbing through the header', async ({ page }) => {
    await page.goto('/login');
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return { width: s.outlineWidth, style: s.outlineStyle };
    });
    expect(outline, 'nothing took focus on first Tab').not.toBeNull();
    expect(outline!.style).not.toBe('none');
    expect(parseFloat(outline!.width)).toBeGreaterThan(0);
  });
});
