import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('a first-login user is forced to change password', async ({ page }) => {
  await login(page, 'e2e-firstlogin', 'E2e-First-Pass-1');
  await expect(page).toHaveURL(/\/change-password/);

  await page.getByLabel('Текущий пароль').fill('E2e-First-Pass-1');
  await page.getByLabel('Новый пароль', { exact: true }).fill('E2e-Changed-Pass-9');
  await page.getByLabel('Повторите новый пароль').fill('E2e-Changed-Pass-9');
  await page.getByRole('button', { name: 'Сменить пароль' }).click();

  await expect(page.getByRole('heading', { name: 'Схема переводов TON-адреса' })).toBeVisible({ timeout: 15000 });
});
