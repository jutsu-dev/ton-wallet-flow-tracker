[English](TUTORIAL.md) | [Русский](TUTORIAL.ru.md)

# Руководство

Первый запуск от начала до конца. Каждая команда здесь соответствует скриптам, которые действительно есть в этом репозитории, — `package.json`, `docker-compose.yml`, `docker/entrypoint.sh` и `scripts/`.

- [A. Быстрый старт через Docker](#a-быстрый-старт-через-docker)
- [B. Локальная разработка без Docker](#b-локальная-разработка-без-docker)
- [C. Особенности Windows](#c-особенности-windows)
- [D. Linux VPS](#d-linux-vps)

---

## A. Быстрый старт через Docker

### 1. Требования

- Git
- Docker Engine (или Docker Desktop)
- Docker Compose v2 (`docker compose`, а не `docker-compose`)
- Ключ **TonAPI**
- Ключ **TON Center**

Оба ключа можно не получать, если вы просто хотите посмотреть интерфейс: поставьте `DEMO_MODE=true`, и приложение отдаст встроенный синтетический сценарий, не обращаясь ни к одному внешнему API.

### 2. Клонирование

```bash
git clone https://github.com/jutsu-dev/ton-wallet-flow-tracker.git
cd ton-wallet-flow-tracker
```

### 3. Создание файла окружения

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 4. Получение API-ключей

- **TonAPI** — войдите на <https://tonconsole.com> и создайте API-ключ.
- **TON Center** — запросите ключ у бота `@tonapibot` в Telegram.

Впишите их в `.env` как `TONAPI_API_KEY` и `TONCENTER_API_KEY`. Оба ключа читает только серверный код, в браузер они не попадают никогда.

### 5. Обязательные переменные

Без них приложение откажется стартовать. У всего остального в `.env.example` есть рабочее значение по умолчанию.

| Переменная | Назначение |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | База данных, которую создаёт контейнер `postgres` |
| `DATABASE_URL` | Как приложение достучится до этой базы — должен совпадать с тремя значениями выше |
| `SESSION_SECRET` | Подписывает и выводит сессионный материал. Минимум 32 символа |
| `AUTH_SECRET` | Секрет, связанный с аутентификацией. Минимум 32 символа |
| `TONAPI_API_KEY`, `TONCENTER_API_KEY` | Доступ к провайдерам. Необязательны только при `DEMO_MODE=true` |

Внутри Compose хост базы — это имя сервиса, поэтому:

```
DATABASE_URL=postgresql://tontracker:YOUR_POSTGRES_PASSWORD@postgres:5432/tontracker
```

Для инструментов на хосте (Prisma CLI на вашей машине) нужен `localhost` и опубликованный порт — см. раздел B.

### 6. Безопасная генерация секретов

Linux/macOS:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"   # POSTGRES_PASSWORD
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # AUTH_SECRET
```

Windows PowerShell — то же самое, если установлен Node. Без Node:

```powershell
[Convert]::ToBase64String((1..24 | ForEach-Object { Get-Random -Maximum 256 })) # POSTGRES_PASSWORD
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 })) # SESSION_SECRET
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 })) # AUTH_SECRET
```

> `Get-Random` — не криптографический генератор случайных чисел. Если Node доступен, берите команды на Node; вариант на PowerShell годится для первой локальной пробы, но не для продакшена.

Никогда не коммитьте `.env`. Git его игнорирует, и так должно остаться.

### 7. Запуск

```bash
docker compose up -d --build
```

Контейнер `app` ждёт, пока `postgres` не отрапортует healthy, после чего `docker/entrypoint.sh` применяет миграции, выполняет идемпотентный seed и запускает сервер.

### 8. Проверка контейнеров

```bash
docker compose ps
```

Оба контейнера — `ton-wallet-tracker-postgres` и `ton-wallet-tracker-app` — должны быть `Up`, причём приложение сообщит `(healthy)` после своего 45-секундного периода старта. Приложение публикует `127.0.0.1:8137->3000/tcp`. **У PostgreSQL хостового порта нет вообще — так и задумано.**

### 9. Логи

```bash
docker compose logs -f app
```

Логи — структурированный JSON: поля, похожие на секреты, замаскированы, адреса сокращены.

### 10. Первый OWNER

Вручную его создавать не нужно. Seed в `prisma/seed.ts` создаёт первого владельца автоматически при старте, и делает это идемпотентно — перезапуск не заведёт второго и не сбросит пароль.

### 11. Временный пароль

Seed записывает случайный временный пароль в `secrets/initial-owner-password`; этот файл монтируется в контейнер из `./secrets`. В логи и в консоль пароль не печатается никогда.

```bash
cat ./secrets/initial-owner-password
```

```powershell
Get-Content .\secrets\initial-owner-password
```

Каталог `secrets/` git игнорирует. Ограничьте доступ к нему своим пользователем — `chmod 600` на Linux/macOS либо см. раздел про Windows ниже.

### 12. Первый вход

Откройте <http://127.0.0.1:8137>, введите имя пользователя владельца и временный пароль.

### 13. Обязательная смена пароля

Приложение сразу потребует новый пароль и не пустит никуда дальше, пока вы его не зададите. Смена заодно отзывает все существующие сессии. После этого удалите файл с временным паролем:

```bash
rm ./secrets/initial-owner-password
```

### 14. Остановка

```bash
docker compose down          # keeps the database volume
docker compose down -v       # ALSO DELETES the database volume and all data
```

### 15. Обновление

```bash
git pull
docker compose up -d --build
```

Entrypoint применит новые миграции при старте. Сначала сделайте резервную копию (шаг 17).

### 16. Миграции

Применяются автоматически при старте контейнера. Чтобы выполнить их вручную:

```bash
docker compose exec app npm run prisma:migrate
```

Как создать новую миграцию во время разработки — см. раздел B.

### 17. Резервное копирование

```bash
./scripts/backup-db.sh
```

Через работающий контейнер `postgres` пишет в `backups/` сжатый gzip дамп `pg_dump` с меткой времени и хранит 14 последних файлов. Проверить дамп:

```bash
./scripts/verify-backup.sh backups/tontracker-YYYYMMDD-HHMMSS.sql.gz
```

Каталог `backups/` git игнорирует. В резервной копии лежат ваши данные — обращайтесь с ней как с конфиденциальной и храните вне этого хоста.

### 18. Восстановление

```bash
./scripts/restore-db.sh backups/tontracker-YYYYMMDD-HHMMSS.sql.gz
```

**Деструктивная операция.** Перезаписывает существующие данные и сначала запрашивает явное подтверждение. Автоматически не запускается никогда.

### 19. Устранение неполадок

| Симптом | Причина и решение |
|---|---|
| Приложение завершается с ошибкой окружения и перечнем ключей | Обязательная переменная отсутствует или слишком короткая. Сообщение называет ключи, но никогда не печатает их значения. Проверьте, что `SESSION_SECRET`/`AUTH_SECRET` не короче 32 символов. |
| `app` никак не становится healthy | `docker compose logs app`. Обычно `DATABASE_URL` указывает на `localhost` вместо `postgres`, и приложение не достаёт до базы внутри сети Compose. |
| После активного тестирования вход перестал проходить вообще | Исчерпан лимит входов на один IP (`LOGIN_MAX_ATTEMPTS * 3` за окно блокировки). Он живёт в памяти: `docker compose restart app` его сбрасывает. |
| `Слишком много запросов` при анализе | Лимит частоты у провайдера или лимит анализов на пользователя. Подождите либо поднимите `MEMBER_ANALYSES_PER_WINDOW`. |
| Строки Jetton/NFT помечены как неполные | Резервный путь через TON Center классифицирует только переводы TON. Это известное ограничение, а не баг — см. [LIMITATIONS.ru.md](LIMITATIONS.ru.md). |
| Порт 8137 уже занят | Поменяйте хостовую часть маппинга в `docker-compose.yml` (`'127.0.0.1:8137:3000'`). Префикс `127.0.0.1:` оставьте. |

---

## B. Локальная разработка без Docker

### Установка

```bash
npm ci            # reproducible install from package-lock.json
```

`npm install` используйте только тогда, когда собираетесь менять зависимости.

### PostgreSQL

Поднимите локальный PostgreSQL 16 и направьте на него `DATABASE_URL`, например:

```
DATABASE_URL=postgresql://tontracker:devpassword@localhost:5432/tontracker
```

Хорошо подходит одноразовый контейнер:

```bash
docker run -d --name twft-devdb -p 127.0.0.1:5433:5432 \
  -e POSTGRES_USER=tontracker -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=tontracker \
  postgres:16-bookworm
```

Тогда используйте в `DATABASE_URL` порт `5433`.

### Миграции и seed

```bash
npx prisma migrate deploy     # apply existing migrations
npm run db:seed               # create the first owner (idempotent)
```

Создание новой миграции:

```bash
npm run prisma:migrate:dev    # prisma migrate dev
```

### Dev-сервер

```bash
npm run dev                   # http://localhost:3000
```

### Тесты

```bash
npm run lint
npm run typecheck
npm test                      # unit + integration (integration needs DATABASE_URL)
npm run build                 # prisma generate && next build
```

### Playwright

Playwright работает против уже запущенного инстанса — сам он его не поднимает. Значение `E2E_BASE_URL` по умолчанию — `http://127.0.0.1:3100`.

```bash
npx tsx e2e/seed-users.ts     # fixture accounts, same DATABASE_URL
npm run build
npx next start -p 3100        # DEMO_MODE=true is enough
npm run test:e2e
```

Здесь важны две вещи:

1. **Поднимайте свежий инстанс.** Число входов ограничено по IP клиента (`LOGIN_MAX_ATTEMPTS * 3` за окно блокировки) и хранится в памяти. Каждый тест входит с `127.0.0.1`, поэтому второй прогон набора внутри того же окна исчерпывает лимит, и всё, что связано со входом, падает. Перезапуск инстанса сбрасывает счётчик, повторный seed — нет.
2. **Прогоняйте seed между запусками.** Тест на принудительную смену пароля расходует одноразовый пароль; seed его восстанавливает.

Чтобы перегенерировать изображения для README:

```bash
CAPTURE_SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts
```

### Продакшен-сборка

```bash
npm run build
npm run start                 # next start -p 3000
```

---

## C. Особенности Windows

Проект собирался и запускался на Windows 11, так что это реальные грабли, а не гипотетические.

- **Docker Desktop** должен быть запущен до любой команды `docker compose`. Если движок не поднят, Compose падает с ошибкой подключения к демону, а не с чем-то внятным.
- **PowerShell, а не bash.** Вместо `cp` используйте `Copy-Item .env.example .env`. Вспомогательные скрипты резервного копирования `scripts/*.sh` написаны на bash — запускайте их из Git Bash или WSL.
- **Блокировка DLL движка Prisma.** `npm run build` может упасть с `EPERM: operation not permitted, rename ... query_engine-windows.dll.node`. Это значит, что DLL всё ещё держит какой-то процесс Node. Найдите и остановите его:

  ```powershell
  Get-Process node | Where-Object { (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine -like '*next start*' }
  Stop-Process -Id <PID> -Force
  ```

- **Оставшиеся процессы Node.** Закрытие терминала не всегда останавливает запущенный из него сервер, и старый процесс продолжает держать порт. Проверьте, кто им владеет на самом деле:

  ```powershell
  Get-NetTCPConnection -LocalPort 3100 -State Listen | Select-Object OwningProcess
  ```

  Забытый слушатель отвечает на проверки состояния, и кажется, будто ваш новый инстанс поднялся, хотя это не так.
- **localhost против 127.0.0.1.** В Windows `localhost` может сначала резолвиться в IPv6-адрес `::1`. Приложение слушает `127.0.0.1`, поэтому в `DATABASE_URL`, `E2E_BASE_URL` и адресах в браузере явно указывайте `127.0.0.1`.
- **NTFS ACL вместо `chmod`.** Никакого `chmod 600` тут нет. Ограничьте `.env` и `secrets/` своим пользователем, отключив наследование:

  ```powershell
  icacls .env /inheritance:r /grant:r "$($env:USERNAME):(F)"
  icacls secrets /inheritance:r /grant:r "$($env:USERNAME):(F)" /t
  ```

- **Папки, синхронизируемые OneDrive.** Если проект лежит внутри OneDrive, держите результаты сборки и данные базы вне синхронизируемого дерева. Всё тяжёлое здесь (`node_modules`, `.next`, `backups/`) уже исключено из git, а база живёт в именованном томе Docker, а не в папке проекта.

---

## D. Linux VPS

### Слушать только loopback

`docker-compose.yml` уже публикует приложение как `127.0.0.1:8137:3000`. **Не убирайте префикс `127.0.0.1:`.** Без него Docker опубликует порт на `0.0.0.0`, и, поскольку Docker пишет собственные правила iptables, порт окажется доступен из интернета, даже если `ufw` утверждает обратное.

### Никогда не публикуйте PostgreSQL

У сервиса `postgres` вообще нет секции `ports:` — он доступен только по внутренней сети Compose. Не добавляйте её. Если нужен доступ через psql, идите через контейнер:

```bash
docker compose exec postgres psql -U tontracker -d tontracker
```

### Обратный прокси и HTTPS

Терминируйте TLS в обратном прокси перед `127.0.0.1:8137`. Приложение само выставляет заголовки безопасности и CSP-nonce на каждый запрос, поэтому прокси должен пропускать ответы как есть, а не переписывать их. Пробрасывайте адрес клиента (`X-Forwarded-For`), чтобы ограничение входов по IP видело реальных клиентов, а не прокси.

Задайте в `APP_URL` публичный HTTPS-origin. Маршрут входа сверяет с ним совпадение источника, поэтому при неверном значении вход ломается с ошибкой CSRF.

### Файрвол

На вход разрешайте только SSH и 443. Порт приложения открывать нельзя — он привязан к loopback, и прокси достучится до него локально.

### Права на `.env`

```bash
chmod 600 .env
chmod 700 secrets
```

В `.env` лежат пароль от базы и оба API-ключа. Всё, что может его прочитать, может ими воспользоваться.

### Политика перезапуска

Оба сервиса уже объявляют `restart: unless-stopped`, так что после перезагрузки или рестарта демона они поднимутся снова. После первой перезагрузки проверьте это, а не считайте само собой разумеющимся:

```bash
docker compose ps
```

### Резервные копии

Поставьте `scripts/backup-db.sh` в расписание (он хранит 14 копий с ротацией) и **копируйте их за пределы хоста** — резервная копия, которая существует только на защищаемой ею машине, никакая не резервная копия. Периодически проверяйте восстановление через `scripts/verify-backup.sh`; непроверенная резервная копия — это догадка.

Подробнее: [DEPLOYMENT.ru.md](DEPLOYMENT.ru.md) и [OPERATIONS.ru.md](OPERATIONS.ru.md).
