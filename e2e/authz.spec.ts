import { test, expect } from '@playwright/test';
import { loginAndLand } from './helpers';

test('a MEMBER cannot reach the OWNER admin page', async ({ page }) => {
  await loginAndLand(page, 'e2e-member', 'E2e-Member-Pass-1');
  await page.goto('/admin');
  // requireOwner redirects members back to the dashboard.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Пользователи' })).toHaveCount(0);
});

test('an OWNER can reach the admin page', async ({ page }) => {
  await loginAndLand(page, 'e2e-owner', 'E2e-Owner-Pass-1');
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Пользователи' })).toBeVisible();
  await expect(page.getByText('Журнал аудита')).toBeVisible();
});
