import { expect, type Page } from '@playwright/test';

export async function login(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Имя пользователя').fill(username);
  await page.getByLabel('Пароль', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
}

export async function loginAndLand(page: Page, username: string, password: string): Promise<void> {
  await login(page, username, password);
  await expect(page.getByRole('heading', { name: 'Схема переводов TON-адреса' })).toBeVisible({
    timeout: 15000,
  });
}
