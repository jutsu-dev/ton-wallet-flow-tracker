import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TelegramAccess } from './telegram-access';

describe('<TelegramAccess />', () => {
  it('explains in Russian how access is granted', () => {
    render(<TelegramAccess />);
    expect(screen.getByText(/Получить доступ \(имя пользователя и пароль\)/)).toBeInTheDocument();
    expect(
      screen.getByText('Доступ выдаётся вручную через личные сообщения Telegram.'),
    ).toBeInTheDocument();
  });

  it('explains in English how access is granted', () => {
    render(<TelegramAccess />);
    expect(screen.getByText(/Get access \(username & password\)/)).toBeInTheDocument();
    expect(
      screen.getByText('Access is issued manually through Telegram direct messages.'),
    ).toBeInTheDocument();
  });

  it('makes the whole access area a link to the direct-message URL', () => {
    render(<TelegramAccess />);
    const access = screen.getByRole('link', { name: /Получить доступ/ });
    expect(access).toHaveAttribute('href', 'https://telegram.me/tonflowapp?direct');
    // Both languages sit inside the one clickable area.
    expect(access).toHaveAccessibleName(/Get access/);
  });

  it('links to the project channel', () => {
    render(<TelegramAccess />);
    expect(screen.getByRole('link', { name: 't.me/tonflowapp' })).toHaveAttribute(
      'href',
      'https://t.me/tonflowapp',
    );
  });

  it('opens every Telegram link in an isolated new tab', () => {
    render(<TelegramAccess />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('offers no public registration', () => {
    render(<TelegramAccess />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(/регистрац/i)).toBeNull();
    expect(screen.queryByText(/sign ?up|register/i)).toBeNull();
  });
});
