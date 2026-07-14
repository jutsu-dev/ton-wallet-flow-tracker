import 'server-only';
import { z } from 'zod';

// Validation is lazy (getEnv) so `next build` never needs runtime secrets present.
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.string().default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  DEMO_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 chars'),

  TON_NETWORK: z.enum(['mainnet', 'testnet']).default('mainnet'),
  TONAPI_API_KEY: z.string().optional().default(''),
  TONCENTER_API_KEY: z.string().optional().default(''),
  TONAPI_BASE_URL: z.string().url().default('https://tonapi.io'),
  TONCENTER_V3_BASE_URL: z.string().url().default('https://toncenter.com/api/v3'),

  MEMBER_ANALYSES_PER_WINDOW: z.coerce.number().int().positive().default(10),
  MEMBER_ANALYSIS_WINDOW_MINUTES: z.coerce.number().int().positive().default(10),
  MEMBER_MAX_CONCURRENT_ANALYSES: z.coerce.number().int().positive().default(3),
  MAX_SOURCE_EVENTS: z.coerce.number().int().positive().max(100).default(100),
  MAX_EXPANSION_DEPTH: z.coerce.number().int().positive().max(3).default(3),
  MAX_GRAPH_NODES: z.coerce.number().int().positive().default(150),
  MAX_GRAPH_EDGES: z.coerce.number().int().positive().default(300),

  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),

  PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  PROVIDER_MAX_RETRIES: z.coerce.number().int().min(1).max(5).default(3),
  PROVIDER_CIRCUIT_THRESHOLD: z.coerce.number().int().positive().default(5),
  PROVIDER_CIRCUIT_RESET_MS: z.coerce.number().int().positive().default(30_000),
  CACHE_TTL_ACCOUNT_MS: z.coerce.number().int().nonnegative().default(30_000),
  CACHE_TTL_EVENTS_MS: z.coerce.number().int().nonnegative().default(60_000),
  CACHE_TTL_DNS_MS: z.coerce.number().int().nonnegative().default(600_000),
  CACHE_TTL_NFT_MS: z.coerce.number().int().nonnegative().default(600_000),
  CACHE_TTL_ERROR_MS: z.coerce.number().int().nonnegative().max(10_000).default(10_000),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

/** Validate and return the server environment. Memoized after first success. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Never print values — only the offending keys.
    const keys = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid environment configuration. Check these keys: ${keys}`);
  }
  cached = parsed.data;
  return cached;
}

/** True when at least one TON provider key is configured. */
export function hasTonApiKey(): boolean {
  return Boolean(process.env.TONAPI_API_KEY);
}

export function hasTonCenterKey(): boolean {
  return Boolean(process.env.TONCENTER_API_KEY);
}
