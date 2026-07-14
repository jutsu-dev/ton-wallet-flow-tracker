[English](API.md) | [Русский](API.ru.md)

# Внутренний API

Это собственные HTTP-обработчики маршрутов приложения, которыми пользуются его же страницы и клиентские компоненты. Это **не** публичный и не стабильный API: версионирования нет, доступа по API-ключу нет, а форматы могут меняться от релиза к релизу. Он описан здесь, чтобы контрибьюторы и эксплуатация точно знали, что каждый эндпоинт принимает и что возвращает.

Все эндпоинты находятся под `/api`. Тела запросов и ответов — JSON.

## Соглашения

**Аутентификация.** Защищённые эндпоинты читают сессию из cookie `twft_session` (непрозрачный токен, на сервере хранится в виде хеша). Отсутствие сессии или сессия отключённого пользователя дают `401 { "error": "unauthorized" }`.

**CSRF.** Изменяющие запросы (`POST`, `DELETE`) требуют обеих половин проверки двойной отправки плюс проверки одного источника:

- значение cookie `twft_csrf` должно быть продублировано в заголовке запроса `x-csrf-token` (сравнение выполняется устойчивым ко времени способом), и
- заголовок `Origin` должен совпадать с `APP_URL`.

Браузерный клиент подставляет заголовок из cookie автоматически. Непройденная проверка возвращает `403 { "error": "csrf" }`. `GET`-эндпоинтам CSRF не нужен. Исключение — вход: до аутентификации CSRF-токена не существует, поэтому там применяется только проверка `Origin` на совпадение источника.

**Ошибки.** Ошибки имеют вид `{ "error": "<code>" }` с подходящим HTTP-статусом. Непрохождение проверки общими Zod-схемами возвращает `400 { "error": "invalid_input" }`.

---

## Аутентификация

### POST /api/auth/login

Требуется совпадение источника; сессия и CSRF-токен не нужны. Тело:

```json
{ "username": "string (1–64)", "password": "string (1–200)" }
```

При успехе устанавливает cookie сессии и CSRF и возвращает:

```json
{ "ok": true, "mustChangePassword": false, "role": "OWNER" }
```

Статусы отказа: `401 invalid` (неверные учётные данные), `423 locked` (учётная запись заблокирована после серии неудач), `403 disabled` (учётная запись деактивирована), `429 rate_limited` (слишком много попыток с этого IP), `403 csrf` (несовпадение источника), `400 invalid_input`.

### POST /api/auth/logout

Аутентификация + CSRF. Тела нет. Уничтожает текущую сессию и очищает cookie. Возвращает `{ "ok": true }`.

### POST /api/auth/change-password

Аутентификация + CSRF. Тело:

```json
{ "currentPassword": "string (1–200)", "newPassword": "string (10–200)" }
```

Проверяет текущий пароль, записывает новый хеш, снимает флаг принудительной смены, отзывает все сессии пользователя и выдаёт новую сессию, чтобы вызывающий остался в системе. Возвращает `{ "ok": true }`. Ошибки: `400 invalid_current` (неверный текущий пароль), `400 invalid_input`, `401 unauthorized`, `403 csrf`.

---

## Анализ

### POST /api/analyze

Аутентификация + CSRF. Выполняет полный анализ адреса. Тело:

```json
{ "address": "EQ… | UQ… | 0:… | name.ton", "limit": 25, "depth": 1 }
```

`limit` должен быть одним из `10, 25, 50, 100` (по умолчанию 25); `depth` — `1–3` (по умолчанию 1). В демо-режиме независимо от ввода возвращается встроенный сценарий.

Ответ (`AnalysisResult`):

```jsonc
{
  "input": "…",                 // original input string
  "address": {                  // NormalizedAddressDto | null
    "raw": "0:…", "bounceable": "EQ…", "nonBounceable": "UQ…", "workchain": 0
  },
  "account": {                  // AccountSummary | null
    "address": "0:…", "bounceable": "EQ…", "nonBounceable": "UQ…",
    "balanceTon": "3.4", "state": "active", "isActive": true,
    "source": "tonapi", "isIncomplete": false
  },
  "actions": [ /* WalletAction[] — see below */ ],
  "nodes":  [ /* GraphNodeDto[] */ ],
  "edges":  [ /* GraphEdgeDto[] */ ],
  "source": "tonapi",           // "tonapi" | "toncenter" | "mixed" | "demo"
  "incomplete": false,
  "warnings": ["…"],
  "truncated": false,           // true if node/edge caps trimmed the graph
  "checkId": "…",               // WalletCheck id, or null if persistence failed
  "demo": false
}
```

Статусы ошибок выводятся из кода ошибки анализа: `400 invalid_address` / `400 dns_unresolved`, `404 not_found`, `429 rate_limited`, `502 provider_unavailable`, `500 internal`.

### POST /api/expand

Аутентификация + CSRF. Подгружает в граф переводы ещё одного узла. Тело:

```json
{ "address": "EQ… | 0:…", "limit": 25 }
```

Ответ (`ExpansionResult`):

```jsonc
{
  "center": "0:…",
  "nodes": [ /* GraphNodeDto[] */ ],
  "edges": [ /* GraphEdgeDto[] */ ],
  "actions": [ /* WalletAction[] */ ],
  "source": "tonapi",
  "incomplete": false,
  "warnings": ["…"],
  "truncated": false
}
```

Статусы ошибок те же, что у `/api/analyze`.

**GraphNodeDto**: `{ address, bounceable, short, isCenter, kind, incoming, outgoing, labels }`, где `kind` — одно из `explored | own | safe | unknown | suspicious | service | exchange | marketplace`, а `labels` — массив `{ labelType, title, note }`.

**GraphEdgeDto**: `{ id, from, to, assetType, label, count, hasFailed, hasSuccess }`. `label` — отображаемая строка (сумма + актив либо сгруппированный счётчик `×N`); `from`/`to` — канонические сырые адреса.

**WalletAction** (на каждую операцию): `id, eventId, traceId, transactionHash, timestamp, status, success, direction, actionType, senderAddress, recipientAddress, accountAddress, amountRaw, amountFormatted, decimals, assetType, assetSymbol, assetName, assetContractAddress, nftAddress, nftName, nftCollectionAddress, nftCollectionName, telegramGiftSlug, telegramGiftNumber, comment, memo, operationCode, source, isIncomplete, rawReference`. Отсутствующие значения — `null`; `actionType` и `assetType` используют доменные перечисления; суммы — строки.

---

## Метки

### GET /api/labels?address=…

Аутентификация. Возвращает метки адреса:

```json
{ "labels": [ { "id": "…", "labelType": "EXCHANGE", "title": "…", "note": "… | null", "createdBy": "username | null", "createdAt": "ISO-8601" } ] }
```

`400 invalid_input`, если `address` не передан.

### POST /api/labels

Аутентификация + CSRF. Тело:

```json
{ "address": "EQ… | 0:…", "labelType": "OWN|SAFE|UNKNOWN|SUSPICIOUS|SERVICE|EXCHANGE|MARKETPLACE|OTHER", "title": "string (1–80)", "note": "string (≤500) | null" }
```

Создаёт метку (привязывая её к кошельку, добавленному через upsert) и возвращает `201 { "label": LabelDto }`. `title` и `note` санитизируются. `400 invalid_address` — если адрес не удалось разобрать.

### DELETE /api/labels/[id]

Аутентификация + CSRF. Удаляет метку по id. Участник может удалять только свои метки, владелец — любые. Возвращает `{ "ok": true }`, либо `404 not_found`, либо `403 forbidden`.

---

## Активы

### GET /api/assets?address=…

Аутентификация (без CSRF, только чтение). Возвращает балансы джеттонов и принадлежащие NFT (`WalletAssets`):

```jsonc
{
  "jettons": [ { "contractAddress": "0:…", "symbol": "USDT|null", "name": "…|null",
                 "decimals": 6, "balanceRaw": "…", "balanceFormatted": "…", "isIncomplete": false } ],
  "nftItems": [ { "address": "0:…", "name": "…|null", "collectionAddress": "0:…|null",
                  "collectionName": "…|null", "index": "…|null", "isIncomplete": false } ],
  "nftCount": 1,
  "source": "tonapi",
  "incomplete": false
}
```

`400 invalid_address` — при некорректном адресе, `502 provider_unavailable` — если оба провайдера дали сбой.

---

## Состояние

### GET /api/health

Без аутентификации. См. [OPERATIONS.ru.md](OPERATIONS.ru.md). Возвращает `{ status, service, database, time }` с HTTP 200 либо HTTP 503, если база данных недоступна.
