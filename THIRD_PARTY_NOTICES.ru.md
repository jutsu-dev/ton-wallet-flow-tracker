[English](THIRD_PARTY_NOTICES.md) | [Русский](THIRD_PARTY_NOTICES.ru.md)

# Уведомления о стороннем ПО

TON Wallet Flow Tracker зависит от программного обеспечения с открытым исходным кодом. Ниже перечислены основные прямые зависимости с их лицензиями — так, как их публикует каждый проект, и с проверкой по установленным пакетам. Транзитивные зависимости здесь не перечисляются.

За авторитетным и исчерпывающим отчётом по всему дереву зависимостей обратитесь к чекеру лицензий, например:

```bash
npx license-checker-rseidelsohn --production --summary
# or
npx license-checker --json > third-party-licenses.json
```

## Зависимости времени выполнения

| Пакет | Версия | Лицензия |
|---|---|---|
| next | 15.5.20 | MIT |
| react | 19.2.7 | MIT |
| react-dom | 19.2.7 | MIT |
| @xyflow/react | 12.11.2 | MIT |
| @ton/core | 0.63.1 | MIT |
| @prisma/client | 6.19.3 | Apache-2.0 |
| zod | 3.25.76 | MIT |
| @node-rs/argon2 | 2.0.2 | MIT |
| @tanstack/react-query | 5.101.2 | MIT |
| html-to-image | 1.11.13 | MIT |
| lucide-react | 1.24.0 | ISC |
| clsx | 2.1.1 | MIT |
| tailwind-merge | 3.6.0 | MIT |
| server-only | 0.0.1 | MIT |

## Зависимости для разработки

| Пакет | Версия | Лицензия |
|---|---|---|
| typescript | 6.0.3 | Apache-2.0 |
| prisma | 6.19.3 | Apache-2.0 |
| tailwindcss | 3.4.19 | MIT |
| postcss | 8.5.19 | MIT |
| autoprefixer | 10.5.2 | MIT |
| vitest | 3.2.7 | MIT |
| @vitest/coverage-v8 | 3.2.7 | MIT |
| @vitejs/plugin-react | 6.0.3 | MIT |
| happy-dom | 20.10.6 | MIT |
| @testing-library/react | 16.3.2 | MIT |
| @testing-library/jest-dom | 6.9.1 | MIT |
| @testing-library/user-event | 14.6.1 | MIT |
| @playwright/test | 1.61.1 | Apache-2.0 |
| msw | 2.15.0 | MIT |
| eslint | 8.57.1 | MIT |
| eslint-config-next | 15.5.20 | MIT |
| prettier | 3.9.5 | MIT |
| prettier-plugin-tailwindcss | 0.8.0 | MIT |
| tsx | 4.23.1 | MIT |

Каждая зависимость остаётся под собственной лицензией; полные тексты лицензий поставляются вместе с пакетами в `node_modules`. Сам этот проект лицензирован под Apache-2.0 (см. [LICENSE](LICENSE) и [NOTICE](NOTICE)).
