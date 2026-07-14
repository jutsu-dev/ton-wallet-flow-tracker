import { test, expect } from '@playwright/test';
import { loginAndLand } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndLand(page, 'e2e-owner', 'E2e-Owner-Pass-1');
});

test('builds a transfer graph', async ({ page }) => {
  await page.goto('/wallet/EQDemoWallet?limit=25&depth=2');
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/Узлов:\s*5\/150/)).toBeVisible();
});

test('filters operations', async ({ page }) => {
  await page.goto('/wallet/EQDemoWallet?limit=25');
  await page.getByRole('button', { name: 'Операции' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  // Filter to NFT only; the demo has one NFT transfer.
  await page.getByLabel('Актив').selectOption('nft');
  await expect(page.getByRole('table')).toBeVisible();
});

test('adds a user label', async ({ page }) => {
  await page.goto('/wallet/EQDemoWallet');
  await page.getByRole('button', { name: 'Метки' }).click();
  const title = `E2E label ${Date.now()}`;
  await page.getByLabel('Название').fill(title);
  await page.getByRole('button', { name: 'Добавить метку' }).click();
  await expect(page.getByText(title)).toBeVisible();
});

test('exports the graph as PNG', async ({ page }) => {
  await page.goto('/wallet/EQDemoWallet');
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 20000 });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Экспорт PNG' }).click(),
  ]);
  expect(download.suggestedFilename()).toContain('.png');
});
