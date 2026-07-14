// Small in-memory TTL cache and a concurrency limiter shared by providers.

export class TtlCache<T> {
  private store = new Map<string, { value: T; expires: number }>();

  constructor(private readonly clock: () => number = Date.now) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.clock() >= entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (ttlMs <= 0) return;
    this.store.set(key, { value, expires: this.clock() + ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}

export type Limiter = <T>(task: () => Promise<T>) => Promise<T>;

/** Bound the number of concurrently in-flight upstream requests. */
export function createLimiter(maxConcurrent: number): Limiter {
  let active = 0;
  const queue: Array<() => void> = [];

  const release = (): void => {
    active -= 1;
    const next = queue.shift();
    if (next) next();
  };

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= maxConcurrent) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active += 1;
    try {
      return await task();
    } finally {
      release();
    }
  };
}
