import { test, expect } from '@playwright/test';
import { loginAndLand } from './helpers';

// Captures the README images. Runs in demo mode, so every pixel is synthetic
// data. Skipped unless CAPTURE_SCREENSHOTS is set, to keep the normal E2E run
// from overwriting committed images.
test.skip(!process.env.CAPTURE_SCREENSHOTS, 'set CAPTURE_SCREENSHOTS=1 to capture');

const DIR = 'docs/assets';

test('capture demo-mode screenshots', async ({ page }) => {
  await loginAndLand(page, 'e2e-owner', 'E2e-Owner-Pass-1');

  // The dashboard's recent-checks and labelled-wallets panels stay empty here by
  // design: demo mode returns fixtures before analyzeWallet reaches the
  // database, so no check is ever recorded.
  await page.screenshot({ path: `${DIR}/dashboard.png`, fullPage: true });

  await page.goto('/wallet/EQDemoWallet?limit=25&depth=2');
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${DIR}/graph.png`, fullPage: true });

  // The real export artifact, not a mock-up of one.
  const download = await Promise.race([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Экспорт PNG' }).click().then(() => page.waitForEvent('download')),
  ]);
  await download.saveAs(`${DIR}/export-preview.png`);

  await page.getByRole('button', { name: 'Операции' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.screenshot({ path: `${DIR}/operations.png`, fullPage: true });

  await page.goto('/docs');
  await expect(page.getByRole('heading', { name: 'Документация', level: 1 })).toBeVisible();
  await page.screenshot({ path: `${DIR}/documentation.png`, fullPage: true });
});
