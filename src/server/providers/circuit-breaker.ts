export type CircuitState = 'closed' | 'open' | 'half_open';

/**
 * Per-provider circuit breaker. After `threshold` consecutive transient
 * failures it opens for `resetMs`, then allows a single half-open probe. The
 * clock is injectable for deterministic tests.
 */
export class CircuitBreaker {
  private failures = 0;
  private state: CircuitState = 'closed';
  private openedAt = 0;

  constructor(
    private readonly threshold: number,
    private readonly resetMs: number,
    private readonly clock: () => number = Date.now,
  ) {}

  canRequest(): boolean {
    if (this.state === 'open') {
      if (this.clock() - this.openedAt >= this.resetMs) {
        this.state = 'half_open';
        return true;
      }
      return false;
    }
    return true;
  }

  onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  onFailure(): void {
    this.failures += 1;
    if (this.state === 'half_open' || this.failures >= this.threshold) {
      this.state = 'open';
      this.openedAt = this.clock();
    }
  }

  get current(): CircuitState {
    return this.state;
  }
}
