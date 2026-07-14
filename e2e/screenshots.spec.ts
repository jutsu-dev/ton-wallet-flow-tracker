import { test, expect } from '@playwright/test';
import { loginAndLand } from './helpers';

// Captures the README screenshots. Runs in demo mode, so every pixel is
// synthetic data. Skipped unless CAPTURE_SCREENSHOTS is set, to keep the normal
// E2E run from overwriting committed images.
test.skip(!process.env.CAPTURE_SCREENSHOTS, 'set CAPTURE_SCREENSHOTS=1 to capture');

test('capture demo-mode screenshots', async ({ page }) => {
  await loginAndLand(page, 'e2e-owner', 'E2e-Owner-Pass-1');
  await page.screenshot({ path: 'docs/screenshots/dashboard.png', fullPage: true });

  await page.goto('/wallet/EQDemoWallet?limit=25&depth=2');
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'docs/screenshots/graph.png', fullPage: true });

  await page.getByRole('button', { name: 'Операции' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/operations.png', fullPage: true });
});
