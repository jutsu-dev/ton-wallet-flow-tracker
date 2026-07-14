import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('unauthenticated access is redirected to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});

test('wrong password shows an error and stays on login', async ({ page }) => {
  await login(page, 'e2e-owner', 'definitely-wrong');
  await expect(page.getByText('Неверное имя пользователя или пароль.')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('owner can log in and log out', async ({ page }) => {
  await login(page, 'e2e-owner', 'E2e-Owner-Pass-1');
  await expect(page.getByText('Анализ TON-адреса')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Выйти' }).click();
  await expect(page).toHaveURL(/\/login/);
});
