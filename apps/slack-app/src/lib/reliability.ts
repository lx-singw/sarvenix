import { createHash, randomUUID } from 'crypto';

export function correlationId(value?: string): string {
  return value?.trim() || randomUUID();
}

export function idempotencyKey(scope: string, ...parts: Array<string | undefined>): string {
  return createHash('sha256')
    .update([scope, ...parts.map(part => part || '')].join(':'))
    .digest('hex');
}

export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`${label} exceeded ${timeoutMs}ms timeout`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt?: number;

  constructor(
    private readonly threshold = 3,
    private readonly resetAfterMs = 30_000
  ) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.openedAt && Date.now() - this.openedAt < this.resetAfterMs) {
      throw new Error('Circuit is open');
    }
    if (this.openedAt) {
      this.openedAt = undefined;
      this.failures = 0;
    }
    try {
      const result = await operation();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures += 1;
      if (this.failures >= this.threshold) this.openedAt = Date.now();
      throw error;
    }
  }

  get state(): 'closed' | 'open' | 'half-open' {
    if (!this.openedAt) return 'closed';
    return Date.now() - this.openedAt >= this.resetAfterMs ? 'half-open' : 'open';
  }
}
