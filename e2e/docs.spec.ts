import { test, expect } from '@playwright/test';
import { loginAndLand } from './helpers';

const GITHUB_URL = 'https://github.com/jutsu-dev/ton-wallet-flow-tracker';
const CHANNEL_URL = 'https://t.me/tonflowapp';
const ACCESS_URL = 'https://telegram.me/tonflowapp?direct';

const SECTIONS = [
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
];

test.describe('public documentation', () => {
  test('is readable without an account', async ({ page }) => {
    // No login: reaching /docs signed out must render the guide, not bounce to
    // the login page. Someone deciding whether to request access reads this first.
    await page.goto('/docs');
    await expect(page).toHaveURL(/\/docs$/);
    await expect(page.getByRole('heading', { name: 'Документация', level: 1 })).toBeVisible();

    for (const heading of SECTIONS) {
      await expect(page.getByRole('heading', { name: new RegExp(heading) })).toBeVisible();
    }

    // Signed out, the header offers a way in and no way out.
    await expect(page.getByRole('link', { name: 'Войти', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Выйти' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Пользователи', exact: true })).toHaveCount(0);

    // The security promises are the point of the page — assert the wording.
    await expect(page.getByText('Seed-фраза не нужна и никогда не запрашивается.')).toBeVisible();
    await expect(page.getByText('Приватный ключ не нужен и никогда не запрашивается.')).toBeVisible();
    await expect(page.getByText('TonConnect и подключение кошелька не используются.')).toBeVisible();
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

    // Every table-of-contents anchor lands on a real section.
    const toc = page.getByRole('navigation', { name: 'Содержание' });
    const tocLinks = await toc.getByRole('link').all();
    expect(tocLinks.length).toBe(SECTIONS.length);
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
  });

  test('switches to English and back without an account', async ({ page }) => {
    await page.goto('/docs');
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

  test('is reachable from the login page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Документация', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Документация', level: 1 })).toBeVisible();
  });

  test('is indexable, while the rest of the instance is not', async ({ page, request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBe(true);
    const body = await robots.text();
    expect(body).toContain('Allow: /docs');
    expect(body).toContain('Disallow: /');
    expect(body).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBe(true);
    const xml = await sitemap.text();
    expect(xml).toContain('/docs');
    expect(xml).toContain('hreflang="en"');
    // The private app must not be advertised to crawlers.
    expect(xml).not.toContain('/login');
    expect(xml).not.toContain('/admin');

    await page.goto('/docs');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/docs$/);

    await page.goto('/docs?lang=en');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/docs\?lang=en$/);
    // The document is lang="ru"; the English guide declares its own subtree.
    await expect(page.locator('div[lang="en"]').first()).toBeVisible();

    // Everything that is not the guide stays out of search results.
    await page.goto('/login');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  });

  test('shows the signed-in header when a session exists', async ({ page }) => {
    await loginAndLand(page, 'e2e-owner', 'E2e-Owner-Pass-1');
    await page.getByRole('link', { name: 'Документация' }).first().click();
    await expect(page.getByRole('heading', { name: 'Документация', level: 1 })).toBeVisible();

    // Same page, but it must not pretend a signed-in owner is a stranger.
    await expect(page.getByText('e2e-owner')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Войти', exact: true })).toHaveCount(0);
  });
});
