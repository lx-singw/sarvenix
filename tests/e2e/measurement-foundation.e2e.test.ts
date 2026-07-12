import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CircuitBreaker, idempotencyKey, withTimeout } from '../../apps/slack-app/src/lib/reliability';

interface Corpus {
  scenarios: Array<{ id: string; category: string }>;
}

describe('championship measurement foundation', () => {
  test('ships a balanced corpus with at least 100 unique scenarios', () => {
    const corpus = JSON.parse(
      readFileSync(resolve(process.cwd(), 'tests/evaluation/corpus.v1.json'), 'utf8')
    ) as Corpus;
    expect(corpus.scenarios.length).toBeGreaterThanOrEqual(100);
    expect(new Set(corpus.scenarios.map(item => item.id)).size).toBe(corpus.scenarios.length);
    expect(new Set(corpus.scenarios.map(item => item.category)).size).toBe(8);
  });

  test('creates stable scoped idempotency keys', () => {
    expect(idempotencyKey('slack-event', 'T1', 'E1')).toBe(idempotencyKey('slack-event', 'T1', 'E1'));
    expect(idempotencyKey('slack-event', 'T1', 'E1')).not.toBe(idempotencyKey('slack-event', 'T1', 'E2'));
  });

  test('bounds slow operations', async () => {
    await expect(withTimeout(
      () => new Promise(resolvePromise => setTimeout(resolvePromise, 30)),
      5,
      'test source'
    )).rejects.toThrow('test source exceeded 5ms timeout');
  });

  test('opens a circuit after repeated source failures', async () => {
    const breaker = new CircuitBreaker(2, 60_000);
    const failure = () => Promise.reject(new Error('source down'));
    await expect(breaker.run(failure)).rejects.toThrow('source down');
    await expect(breaker.run(failure)).rejects.toThrow('source down');
    expect(breaker.state).toBe('open');
    await expect(breaker.run(() => Promise.resolve('unexpected'))).rejects.toThrow('Circuit is open');
  });
});
