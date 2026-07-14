import { test, expect } from '@playwright/test';
import { loginAndLand } from './helpers';

const GITHUB_URL = 'https://github.com/jutsu-dev/ton-wallet-flow-tracker';
const CHANNEL_URL = 'https://t.me/tonflowapp';
const ACCESS_URL = 'https://telegram.me/tonflowapp?direct';

// /docs lives behind auth, and logins are budgeted per client IP
// (LOGIN_MAX_ATTEMPTS * 3 per lockout window) which the whole suite shares from
// 127.0.0.1 — so this covers the page in one signed-in session rather than
// spending a login per assertion.
test('in-app documentation: reachable, bilingual, and links out correctly', async ({ page }) => {
  await loginAndLand(page, 'e2e-owner', 'E2e-Owner-Pass-1');

  await page.getByRole('link', { name: 'Документация' }).first().click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole('heading', { name: 'Документация', level: 1 })).toBeVisible();

  // The questions the guide must answer, not merely "a page rendered".
  for (const heading of [
    'Что делает приложение',
    'Как получить доступ и войти',
    'Как проверить TON-адрес',
    'Как читать граф',
    'Операции и метки',
    'Активы и NFT',
    'Экспорт',
    'Чего приложение не устанавливает',
    'Безопасность',
    'Ссылки',
  ]) {
    await expect(page.getByRole('heading', { name: new RegExp(heading) })).toBeVisible();
  }

  // The security promises are the point of the page — assert the actual wording.
  await expect(page.getByText('Seed-фраза не нужна и никогда не запрашивается.')).toBeVisible();
  await expect(page.getByText('Приватный ключ не нужен и никогда не запрашивается.')).toBeVisible();
  await expect(page.getByText('TonConnect и подключение кошелька не используются.')).toBeVisible();

  // Access is manual and there is no public registration.
  await expect(
    page.getByText(
      'Размещённая версия закрыта. Публичной регистрации нет. Учётные записи выдаются вручную через Telegram.',
    ),
  ).toBeVisible();

  await expect(page.getByRole('link', { name: 'Исходный код на GitHub' })).toHaveAttribute(
    'href',
    GITHUB_URL,
  );
  await expect(page.getByRole('link', { name: 'Запросить доступ в Telegram' })).toHaveAttribute(
    'href',
    ACCESS_URL,
  );
  await expect(page.getByRole('link', { name: 'Telegram-канал проекта' })).toHaveAttribute(
    'href',
    CHANNEL_URL,
  );

  // Table of contents: every anchor must land on a real section.
  const toc = page.getByRole('navigation', { name: 'Содержание' });
  const tocLinks = await toc.getByRole('link').all();
  expect(tocLinks.length).toBeGreaterThan(5);
  for (const link of tocLinks) {
    const href = await link.getAttribute('href');
    expect(href).toMatch(/^#/);
    await expect(page.locator(`section${href}`)).toHaveCount(1);
  }

  // Every outbound link opens in an isolated tab.
  for (const link of await page.locator('a[href^="https://"]').all()) {
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }

  // English, and back.
  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/lang=en/);
  await expect(page.getByRole('heading', { name: 'Documentation', level: 1 })).toBeVisible();
  await expect(page.getByText('No seed phrase is needed, and none is ever requested.')).toBeVisible();
  await expect(
    page.getByText(
      'The hosted instance is private. There is no public registration. Accounts are issued manually through Telegram.',
    ),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Русский' }).click();
  await expect(page.getByRole('heading', { name: 'Документация', level: 1 })).toBeVisible();
});
