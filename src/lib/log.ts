import { shortenAddress } from '@/lib/utils';

// Minimal structured JSON logger. No pid/hostname (the host name must never leak),
// no secrets: any field whose key looks sensitive is redacted, recursively.

type Level = 'debug' | 'info' | 'warn' | 'error';
const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const env = (process.env.LOG_LEVEL as Level | undefined) ?? 'info';
  return LEVELS[env] ?? LEVELS.info;
}

const SECRET_KEY_RE = /^(authorization|cookie|api[-_]?key|token|password|passwordhash|secret|session|bearer)$/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[deep]';
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY_RE.test(k) ? '[redacted]' : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

function emit(level: Level, msg: string, fields?: Record<string, unknown>): void {
  if (LEVELS[level] < threshold()) return;
  const record = {
    level,
    time: new Date().toISOString(),
    msg,
    ...(fields ? (redact(fields) as Record<string, unknown>) : {}),
  };
  const line = JSON.stringify(record);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit('error', msg, fields),
};

/** Shorten an address for log fields so full addresses never sit in system logs. */
export function maskAddress(address: string | null | undefined): string {
  if (!address) return '';
  return shortenAddress(address, 6, 4);
}
