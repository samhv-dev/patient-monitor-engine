// Shared test helpers for @pme/controller.
import type { ManagedTransport, TransportStatus, WireMessage } from '../src/protocol.ts';

/** Poll until `pred()` is true (default 2 s). */
export async function waitFor(pred: () => boolean, timeoutMs = 2000, what = 'condition'): Promise<void> {
  const t0 = Date.now();
  while (!pred()) {
    if (Date.now() - t0 > timeoutMs) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 5));
  }
}

export const waitStatus = (t: ManagedTransport, s: TransportStatus, ms = 2000) => waitFor(() => t.status === s, ms, `status ${s}`);

/** Collect every message a transport receives. */
export function collect(t: ManagedTransport): WireMessage[] {
  const got: WireMessage[] = [];
  t.onMessage((m) => got.push(m));
  return got;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
