// Russian-first UI strings. Structured as a flat map so an English locale can be
// added later without touching call sites.

export const ERROR_MESSAGES: Record<string, string> = {
  error: 'Произошла ошибка.',
  invalid_input: 'Проверьте введённые данные.',
  invalid_address: 'Адрес не распознан. Проверьте формат TON-адреса или .ton имени.',
  dns_unresolved: 'Имя .ton не разрешено в адрес.',
  rate_limited: 'Слишком много запросов. Подождите немного и повторите.',
  provider_unavailable: 'Источник данных временно недоступен. Попробуйте позже.',
  not_found: 'Данные не найдены.',
  internal: 'Внутренняя ошибка сервера.',
  invalid: 'Неверное имя пользователя или пароль.',
  unauthorized: 'Требуется вход в систему.',
  csrf: 'Сессия устарела. Обновите страницу и повторите.',
  invalid_current: 'Текущий пароль неверен.',
  locked: 'Аккаунт временно заблокирован из-за неудачных попыток входа.',
  disabled: 'Аккаунт отключён администратором.',
  forbidden: 'Недостаточно прав для этого действия.',
};

export function errorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.error!;
}

export const LABEL_TYPE_LABELS: Record<string, string> = {
  OWN: 'Мой кошелёк',
  SAFE: 'Безопасный',
  UNKNOWN: 'Неизвестный',
  SUSPICIOUS: 'Подозрительный',
  SERVICE: 'Сервис',
  EXCHANGE: 'Биржа',
  MARKETPLACE: 'Маркетплейс',
  OTHER: 'Другое',
};

export const ACTION_TYPE_LABELS: Record<string, string> = {
  ton_transfer: 'Перевод TON',
  jetton_transfer: 'Перевод Jetton',
  nft_transfer: 'Перевод NFT',
  nft_purchase: 'Покупка NFT',
  nft_sale: 'Продажа NFT',
  contract_call: 'Вызов контракта',
  failed_transfer: 'Неуспешная операция',
  unknown: 'Неизвестно',
};

export const DIRECTION_LABELS: Record<string, string> = {
  in: 'Входящая',
  out: 'Исходящая',
  self: 'Себе',
  unknown: '—',
};
