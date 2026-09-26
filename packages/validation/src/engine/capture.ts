// Headless engine capture for the harness: run @pme/engine-core in Node with a fixed seed and scripted commands,
// return the requested channels at their native rates plus every event. Yields to the event loop once per
// sim-minute (the CI rule from docs/RESUME.md) so long captures never starve a Vitest worker.
import { createEngine, type ChannelId, type Command, type EngineEvent, type EngineOptions, type MonitorEngine } from '@pme/engine-core';

export interface Capture {
  engine: MonitorEngine;
  events: EngineEvent[];
  /** Channel samples for sim time [fromS, toS), at `rate` Hz. */
  channels: Partial<Record<ChannelId, { fs: number; x: Float64Array }>>;
  fromS: number;
  toS: number;
}

let n = 0;
export const cmd = (body: Record<string, unknown>): Command => ({ id: `v${++n}`, issuedBy: 'validation', ...body }) as Command;
export const clinical = (event: Record<string, unknown>): Command => cmd({ type: 'applyEvent', event });

export async function capture(o: {
  engine: EngineOptions;
  /** Commands dispatched at sim time t (s). */
  script?: Array<{ t: number; cmd: Command }>;
  channels: ChannelId[];
  fromS: number;
  toS: number;
}): Promise<Capture> {
  const engine = createEngine(o.engine);
  const events: EngineEvent[] = [];
  engine.on((e) => events.push(e));
  const script = [...(o.script ?? [])].sort((a, b) => a.t - b.t);
  const channels: Capture['channels'] = {};
  for (const ch of o.channels) {
    const fs = engine.sampleRate(ch);
    channels[ch] = { fs, x: new Float64Array(Math.round((o.toS - o.fromS) * fs)) };
  }
  // The engine keeps 120 s per channel (BUFFER_SECONDS), so samples are copied out after every ≤ 20 s chunk.
  const LOOKAHEAD_S = 0.2;
  let read = o.fromS;
  const drain = (upTo: number) => {
    const to = Math.min(o.toS, upTo);
    if (to <= read) return;
    for (const ch of o.channels) {
      const c = channels[ch] as { fs: number; x: Float64Array };
      const i0 = Math.round((read - o.fromS) * c.fs);
      const i1 = Math.round((to - o.fromS) * c.fs);
      const buf = new Float32Array(i1 - i0);
      engine.readSamples(ch, Math.round(o.fromS * c.fs) + i0, buf);
      c.x.set(buf, i0);
    }
    read = to;
  };
  let k = 0;
  let t = 0;
  let sinceYield = 0;
  while (t < o.toS + LOOKAHEAD_S) {
    const next = Math.min(o.toS + LOOKAHEAD_S, t + 20, script[k]?.t ?? Infinity);
    engine.advanceTo(next);
    sinceYield += next - t;
    t = next;
    while (k < script.length && (script[k] as { t: number }).t <= t + 1e-9) engine.dispatch((script[k++] as { cmd: Command }).cmd);
    drain(t - LOOKAHEAD_S);
    if (sinceYield >= 60) {
      sinceYield = 0;
      await new Promise<void>((r) => setImmediate(r));
    }
  }
  return { engine, events, channels, fromS: o.fromS, toS: o.toS };
}
