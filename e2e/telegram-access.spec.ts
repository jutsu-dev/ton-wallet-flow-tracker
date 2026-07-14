import { test, expect } from '@playwright/test';
import { loginAndLand } from './helpers';

const ACCESS_URL = 'https://telegram.me/tonflowapp?direct';
const CHANNEL_URL = 'https://t.me/tonflowapp';

test.describe('Telegram access block on the login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows the access instructions in both languages', async ({ page }) => {
    await expect(page.getByText('Получить доступ (имя пользователя и пароль)')).toBeVisible();
    await expect(
      page.getByText('Доступ выдаётся вручную через личные сообщения Telegram.'),
    ).toBeVisible();
    await expect(page.getByText('Get access (username & password)')).toBeVisible();
    await expect(
      page.getByText('Access is issued manually through Telegram direct messages.'),
    ).toBeVisible();
  });

  test('sends the whole access area to the direct-message link in a safe new tab', async ({
    page,
  }) => {
    const access = page.getByRole('link', { name: /Получить доступ/ });
    await expect(access).toHaveAttribute('href', ACCESS_URL);
    await expect(access).toHaveAttribute('target', '_blank');
    await expect(access).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('links to the project channel in a safe new tab', async ({ page }) => {
    const channel = page.getByRole('link', { name: 't.me/tonflowapp' });
    await expect(channel).toHaveAttribute('href', CHANNEL_URL);
    await expect(channel).toHaveAttribute('target', '_blank');
    await expect(channel).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('offers no public registration', async ({ page }) => {
    await expect(page.getByText('Публичная регистрация недоступна.')).toBeVisible();
    await expect(page.getByText('No public registration')).toBeVisible();
    await expect(page.getByRole('link', { name: /регистрац|sign ?up|register/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /регистрац|sign ?up|register/i })).toHaveCount(0);
  });

  test('keeps both links usable at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    const access = page.getByRole('link', { name: /Получить доступ/ });
    const channel = page.getByRole('link', { name: 't.me/tonflowapp' });
    await expect(access).toBeVisible();
    await expect(channel).toBeVisible();

    // Long URLs must wrap rather than push the page sideways.
    for (const link of [access, channel]) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(375);
    }
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
});

// One login for both widths: logins are budgeted per IP (LOGIN_MAX_ATTEMPTS * 3
// per lockout window) and the whole suite shares 127.0.0.1.
test('Telegram channel link on the dashboard, body and footer, at both widths', async ({ page }) => {
  await loginAndLand(page, 'e2e-owner', 'E2e-Owner-Pass-1');

  await expect(page.getByText('Новости проекта:')).toBeVisible();
  const links = page.getByRole('link', { name: 't.me/tonflowapp' });
  await expect(links).toHaveCount(2);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute('href', CHANNEL_URL);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }

  await page.setViewportSize({ width: 375, height: 667 });
  await page.reload();
  for (const link of await links.all()) {
    await expect(link).toBeVisible();
    const box = await link.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  }
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
