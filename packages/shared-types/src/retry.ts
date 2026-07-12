export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  isRetryable?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number, delayMs: number) => void;
}

/**
 * Executes an asynchronous function with exponential backoff retries on transient errors.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 500;
  const backoffFactor = options.backoffFactor ?? 2;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const retryable = options.isRetryable ? options.isRetryable(error) : true;

      if (attempt >= maxAttempts || !retryable) {
        throw error;
      }

      if (options.onRetry) {
        options.onRetry(error, attempt, delay);
      } else {
        console.warn(
          `[Retry] Attempt ${attempt} failed. Retrying in ${delay}ms. Error: ${error.message || error}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= backoffFactor;
    }
  }
}
