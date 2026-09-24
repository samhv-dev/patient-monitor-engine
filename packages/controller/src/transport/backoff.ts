// Reconnect delays: exponential with jitter, capped [ENG].
export interface BackoffOptions {
  baseMs: number;
  maxMs: number;
  /** ± fraction of the delay, 0–1. */
  jitter: number;
}
export const DEFAULT_BACKOFF: BackoffOptions = { baseMs: 250, maxMs: 8000, jitter: 0.2 };

/** Delay before reconnect attempt `attempt` (0-based): min(max, base·2^attempt) · (1 ± jitter). */
export function backoffDelay(attempt: number, o: BackoffOptions = DEFAULT_BACKOFF, rand: () => number = Math.random): number {
  const d = Math.min(o.maxMs, o.baseMs * 2 ** Math.max(0, attempt));
  return Math.round(d * (1 - o.jitter + 2 * o.jitter * rand()));
}
