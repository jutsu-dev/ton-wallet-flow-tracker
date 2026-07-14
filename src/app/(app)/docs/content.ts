// User guide for the hosted instance, in both languages.
//
// The guide is plain data rendered as JSX by page.tsx — never as raw HTML — so
// no part of it can inject markup. Both languages must state the same facts; if
// you change one, change the other in the same commit.

export type Lang = 'ru' | 'en';

/** Keys into the project link registry, resolved at render time by page.tsx. */
export type LinkKey =
  | 'TELEGRAM_CHANNEL_URL'
  | 'TELEGRAM_ACCESS_URL'
  | 'GITHUB_URL'
  | 'SECURITY_POLICY_URL'
  | 'DOCS_URL';

export interface DocLink {
  label: string;
  href: LinkKey;
}

export interface DocSection {
  id: string;
  title: string;
  /** Short framing paragraph. */
  lede?: string;
  /** Numbered cards: a discrete action the reader takes. */
  steps?: { title: string; body: string }[];
  /** Statements that are not steps. */
  points?: string[];
  links?: DocLink[];
}

export interface DocPage {
  title: string;
  lede: string;
  tocTitle: string;
  switchLabel: string;
  demoNote: string;
  sections: DocSection[];
}

export const DOC_LANGS: Lang[] = ['ru', 'en'];

export function isLang(value: string | undefined): value is Lang {
  return value === 'ru' || value === 'en';
}

const ru: DocPage = {
  title: 'Документация',
  lede: 'Как пользоваться TON Wallet Flow Tracker: от получения доступа до экспорта готовой схемы.',
  tocTitle: 'Содержание',
  switchLabel: 'English',
  demoNote:
    'В демо-режиме приложение показывает встроенный синтетический пример и не обращается к внешним API.',
  sections: [
    {
      id: 'what',
      title: 'Что делает приложение',
      lede: 'Приложение читает публичную историю TON-адреса и рисует переводы как интерактивный граф.',
      points: [
        'Загружает операции адреса из публичных источников — TonAPI, с запасным TON Center.',
        'Приводит переводы TON, Jetton, NFT и Telegram-подарков к одной модели событий.',
        'Строит граф: проверяемый адрес в центре, контрагенты вокруг.',
        'Показывает те же операции таблицей с фильтрами и поиском.',
        'Позволяет добавлять свои метки и выгружать схему в PNG или SVG.',
      ],
    },
    {
      id: 'access',
      title: 'Как получить доступ и войти',
      lede: 'Размещённая версия закрыта. Публичной регистрации нет. Учётные записи выдаются вручную через Telegram.',
      steps: [
        {
          title: 'Запросите доступ',
          body: 'Напишите в личные сообщения Telegram. Выдача ручная, поэтому ответ приходит не мгновенно.',
        },
        {
          title: 'Получите имя пользователя и временный пароль',
          body: 'Их присылают в личных сообщениях. Временный пароль одноразовый.',
        },
        {
          title: 'Войдите',
          body: 'Введите имя пользователя и временный пароль на странице входа.',
        },
        {
          title: 'Смените пароль',
          body: 'При первом входе приложение потребует задать свой пароль. Пока вы этого не сделаете, остальные разделы недоступны. Смена пароля завершает все прежние сессии.',
        },
      ],
      points: [
        'После нескольких неудачных попыток вход временно блокируется — это защита от перебора, а не ошибка.',
      ],
    },
    {
      id: 'analyze',
      title: 'Как проверить TON-адрес',
      lede: 'Форма на главной странице принимает адрес в любом из принятых форматов.',
      steps: [
        {
          title: 'Вставьте адрес',
          body: 'Подходят EQ… (bounceable), UQ… (non-bounceable), 0:… (raw) и имена .ton. Контрольная сумма проверяется до запроса; ошибочный адрес отклоняется сразу.',
        },
        {
          title: 'Выберите количество операций',
          body: 'Доступны 10, 25, 50 и 100 — это верхняя граница числа исходных событий, которые будут загружены. Больше операций — полнее картина и дольше запрос.',
        },
        {
          title: 'Выберите глубину',
          body: 'Глубина 1 показывает только прямых контрагентов адреса. Глубина 2 добавляет контрагентов контрагентов, глубина 3 — ещё один шаг. Максимум — 3.',
        },
        {
          title: 'Нажмите «Построить схему»',
          body: 'Приложение загрузит операции и откроет страницу адреса с графом.',
        },
      ],
    },
    {
      id: 'graph',
      title: 'Как читать граф',
      lede: 'Схема кодирует направление, объём и характер переводов формой, а не только цветом.',
      points: [
        'Проверяемый адрес — в центре, контрагенты — вокруг него.',
        'Стрелка направлена к получателю средств.',
        'Подпись на ребре — сумма перевода: TON, символ Jetton, имя NFT либо счётчик ×N, если операции сгруппированы.',
        'Чем толще ребро, тем больше операций оно объединяет.',
        'Пунктирное ребро означает, что все сгруппированные в нём операции завершились неуспешно.',
        'Тип узла кодируется стилем рамки, а не только цветом, — схема остаётся читаемой при чёрно-белой печати и при дальтонизме.',
        'Клик по контрагенту раскрывает его собственные переводы, не покидая страницы. Уже посещённые адреса повторно не разворачиваются, поэтому циклы не зацикливают загрузку.',
        'Действуют жёсткие ограничения — 150 узлов и 300 рёбер. При достижении предела приложение показывает уведомление и перестаёт добавлять новые элементы, чтобы схема оставалась читаемой.',
      ],
    },
    {
      id: 'operations',
      title: 'Операции и метки',
      lede: 'Вкладка «Операции» показывает те же данные таблицей — там удобнее искать конкретный перевод.',
      points: [
        'Фильтры: тип актива, направление, статус.',
        'Поиск по адресам и текстовым комментариям (memo).',
        'Диапазон дат, сортировка по времени или сумме, постраничный просмотр.',
        'Каждая строка показывает источник данных, из которого она получена.',
        'На вкладке «Метки» адресу можно присвоить метку: «Мой кошелёк», «Безопасный», «Неизвестный», «Подозрительный», «Сервис», «Биржа», «Маркетплейс» или «Другое» — с заголовком и примечанием.',
        'Метки добавляют пользователи. Это не подтверждённые системой факты, и приложение так и подписывает их в интерфейсе. Изменения меток попадают в журнал аудита.',
      ],
    },
    {
      id: 'assets',
      title: 'Активы и NFT',
      lede: 'Вкладка «Активы» загружает по запросу балансы Jetton и список NFT, принадлежащих адресу.',
      points: [
        'Переводы NFT и Telegram-подарков видны как рёбра графа и как строки в таблице операций — там же, где обычные переводы.',
        'Отдельного режима сквозной трассировки одного NFT по цепочке владельцев пока нет: он есть на уровне провайдеров, но не выведен в интерфейс. Это указано в ROADMAP, а не выдаётся за готовую возможность.',
      ],
    },
    {
      id: 'export',
      title: 'Экспорт',
      lede: 'Схему можно выгрузить прямо со страницы графа.',
      points: [
        '«Экспорт PNG» — растровое изображение текущего графа.',
        '«Экспорт SVG» — векторный файл, пригодный для печати и вставки в отчёт.',
        '«Квадрат 2048×2048» — квадратный PNG на белом фоне.',
        'Экспортируется то, что вы видите на схеме сейчас, включая раскрытые узлы.',
      ],
    },
    {
      id: 'cannot',
      title: 'Чего приложение не устанавливает',
      lede: 'Важно понимать границы: инструмент показывает движение средств, а не личности и не намерения.',
      points: [
        'Не определяет владельца адреса и не связывает адрес с человеком или компанией.',
        'Не выносит вердикт о мошенничестве и не помечает адреса как преступные автоматически.',
        'Не является финансовым или юридическим советом и не заменяет расследование.',
        'Запасной источник TON Center распознаёт только переводы TON: Jetton и NFT на этом пути помечаются как неполные данные.',
        'Ссылки на обозреватели ведут на адрес, а не на конкретную транзакцию, потому что лента событий не содержит хэшей отдельных транзакций.',
      ],
    },
    {
      id: 'security',
      title: 'Безопасность',
      lede: 'Приложение работает только с публичными данными блокчейна.',
      points: [
        'Seed-фраза не нужна и никогда не запрашивается.',
        'Приватный ключ не нужен и никогда не запрашивается.',
        'TonConnect и подключение кошелька не используются.',
        'Приложение не подписывает и не отправляет транзакции и не распоряжается средствами.',
        'Если какая-либо страница просит у вас seed-фразу или приватный ключ — это не наше приложение. Закройте её.',
      ],
    },
    {
      id: 'links',
      title: 'Ссылки',
      links: [
        { label: 'Telegram-канал проекта', href: 'TELEGRAM_CHANNEL_URL' },
        { label: 'Запросить доступ в Telegram', href: 'TELEGRAM_ACCESS_URL' },
        { label: 'Исходный код на GitHub', href: 'GITHUB_URL' },
        { label: 'Политика безопасности (SECURITY.md)', href: 'SECURITY_POLICY_URL' },
        { label: 'Полная документация проекта', href: 'DOCS_URL' },
      ],
    },
  ],
};

const en: DocPage = {
  title: 'Documentation',
  lede: 'How to use TON Wallet Flow Tracker, from requesting access to exporting a finished diagram.',
  tocTitle: 'Contents',
  switchLabel: 'Русский',
  demoNote:
    'In demo mode the app shows a built-in synthetic example and never calls an external API.',
  sections: [
    {
      id: 'what',
      title: 'What the app does',
      lede: 'The app reads the public history of a TON address and draws its transfers as an interactive graph.',
      points: [
        'Loads an address’s operations from public sources — TonAPI, with TON Center as a fallback.',
        'Normalizes TON, Jetton, NFT and Telegram collectible transfers into a single event model.',
        'Draws a graph with the analyzed address at the center and counterparties around it.',
        'Shows the same operations as a table with filters and search.',
        'Lets you add your own labels and export the diagram as PNG or SVG.',
      ],
    },
    {
      id: 'access',
      title: 'Getting access and signing in',
      lede: 'The hosted instance is private. There is no public registration. Accounts are issued manually through Telegram.',
      steps: [
        {
          title: 'Request access',
          body: 'Send a Telegram direct message. Accounts are issued by hand, so a reply is not instant.',
        },
        {
          title: 'Receive a username and temporary password',
          body: 'Both arrive by Telegram direct message. The temporary password is single-use.',
        },
        {
          title: 'Sign in',
          body: 'Enter the username and temporary password on the login page.',
        },
        {
          title: 'Change the password',
          body: 'On first sign-in the app requires you to set your own password. Nothing else is reachable until you do. Changing it also ends any earlier sessions.',
        },
      ],
      points: [
        'After several failed attempts sign-in is temporarily locked. That is brute-force protection, not a fault.',
      ],
    },
    {
      id: 'analyze',
      title: 'Checking a TON address',
      lede: 'The form on the main page accepts an address in any of the supported formats.',
      steps: [
        {
          title: 'Paste an address',
          body: 'EQ… (bounceable), UQ… (non-bounceable), 0:… (raw) and .ton names all work. The checksum is verified before any request, so a malformed address is rejected immediately.',
        },
        {
          title: 'Choose how many operations',
          body: '10, 25, 50 and 100 are available. This caps how many source events are loaded. More operations means a fuller picture and a slower request.',
        },
        {
          title: 'Choose the depth',
          body: 'Depth 1 shows only the address’s direct counterparties. Depth 2 adds their counterparties, depth 3 one step further. Three is the maximum.',
        },
        {
          title: 'Press “Построить схему” (Build diagram)',
          body: 'The app loads the operations and opens the address page with the graph.',
        },
      ],
    },
    {
      id: 'graph',
      title: 'Reading the graph',
      lede: 'The diagram encodes direction, volume and outcome through shape, not colour alone.',
      points: [
        'The analyzed address sits at the center; counterparties surround it.',
        'Arrows point toward the recipient of the funds.',
        'An edge label carries the amount moved: TON, a jetton symbol, an NFT name, or a ×N count when operations are grouped.',
        'The thicker the edge, the more operations it aggregates.',
        'A dashed edge means every operation grouped into it failed.',
        'Node kind is encoded by border style rather than colour alone, so the diagram survives black-and-white printing and colour blindness.',
        'Clicking a counterparty expands its own transfers without leaving the page. Already-visited addresses are not expanded twice, so cycles cannot loop the loader.',
        'Hard caps of 150 nodes and 300 edges apply. On reaching a cap the app shows a notice and stops adding elements, keeping the diagram readable.',
      ],
    },
    {
      id: 'operations',
      title: 'Operations and labels',
      lede: 'The “Операции” (Operations) tab shows the same data as a table, which is easier for finding one specific transfer.',
      points: [
        'Filters: asset kind, direction, status.',
        'Free-text search across addresses and memos.',
        'Date range, sorting by time or amount, and paging.',
        'Every row shows which data source produced it.',
        'On the “Метки” (Labels) tab you can tag an address as own, safe, unknown, suspicious, service, exchange, marketplace or other, with a title and a note.',
        'Labels are user-supplied. They are not system-confirmed facts, and the interface says so wherever they appear. Label changes are written to the audit log.',
      ],
    },
    {
      id: 'assets',
      title: 'Assets and NFTs',
      lede: 'The “Активы” (Assets) tab loads jetton balances and the address’s NFTs on demand.',
      points: [
        'NFT and Telegram collectible transfers appear as graph edges and as rows in the operations table, alongside ordinary transfers.',
        'There is no dedicated mode yet for tracing a single NFT through its chain of owners: the capability exists at the provider layer but has no interface screen. It is listed in the roadmap rather than presented as a finished feature.',
      ],
    },
    {
      id: 'export',
      title: 'Exporting',
      lede: 'The diagram can be exported straight from the graph page.',
      points: [
        '“Экспорт PNG” — a raster image of the current graph.',
        '“Экспорт SVG” — a vector file suitable for printing or dropping into a report.',
        '“Квадрат 2048×2048” — a square PNG on a white background.',
        'What you export is what the diagram currently shows, including any nodes you expanded.',
      ],
    },
    {
      id: 'cannot',
      title: 'What the app does not establish',
      lede: 'The limits matter: this tool shows how funds moved, not who moved them or why.',
      points: [
        'It does not identify an address’s owner or tie an address to a person or company.',
        'It does not judge fraud and does not flag addresses as criminal automatically.',
        'It is not financial or legal advice and does not replace an investigation.',
        'The TON Center fallback classifies only TON transfers: jetton and NFT movements are marked incomplete on that path.',
        'Explorer links point at an address rather than an individual transaction, because the events feed carries no per-transaction hashes.',
      ],
    },
    {
      id: 'security',
      title: 'Security',
      lede: 'The app works only with public blockchain data.',
      points: [
        'No seed phrase is needed, and none is ever requested.',
        'No private key is needed, and none is ever requested.',
        'TonConnect and wallet connection are not used.',
        'The app never signs or sends transactions and never controls funds.',
        'If any page asks you for a seed phrase or a private key, it is not this app. Close it.',
      ],
    },
    {
      id: 'links',
      title: 'Links',
      links: [
        { label: 'Project Telegram channel', href: 'TELEGRAM_CHANNEL_URL' },
        { label: 'Request access on Telegram', href: 'TELEGRAM_ACCESS_URL' },
        { label: 'Source code on GitHub', href: 'GITHUB_URL' },
        { label: 'Security policy (SECURITY.md)', href: 'SECURITY_POLICY_URL' },
        { label: 'Full project documentation', href: 'DOCS_URL' },
      ],
    },
  ],
};

export const DOCS: Record<Lang, DocPage> = { ru, en };
