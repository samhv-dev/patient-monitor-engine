// Stage 7d engine-test helpers: an engine with the organ event log, a command sender, and a minute-yielding runner
// (CI rule: ≤ 1 simulated minute per call, yield between minutes).
import { createEngine } from '../../src/engine.ts';
import type { Command, EngineEvent, EngineOptions, MonitorEngine, OrgansEvent } from '../../src/index.ts';

export interface OrgansRig {
  e: MonitorEngine;
  organs: OrgansEvent[];
  hr: number[];
  last(): OrgansEvent;
  send(body: Record<string, unknown>): void;
  run(seconds: number, each?: (t: number) => void): Promise<void>;
}

export function organsRig(opts: EngineOptions): OrgansRig {
  const e = createEngine(opts);
  const organs: OrgansEvent[] = [];
  const hr: number[] = [];
  e.on((x: EngineEvent) => {
    if (x.type === 'organs') organs.push(x);
    else if (x.type === 'measurement' && x.values.hr?.value != null) hr.push(x.values.hr.value);
  }, ['organs', 'measurement']);
  let n = 0;
  return {
    e, organs, hr,
    last: () => organs[organs.length - 1] as OrgansEvent,
    send(body) {
      const r = e.dispatch({ id: `o${++n}`, issuedBy: 'test', ...body } as Command);
      if (!r.accepted) throw new Error(`rejected: ${r.reason}`);
      e.step(1);
    },
    async run(seconds, each) {
      const t0 = e.now().simT;
      for (let s = 0; s < seconds; ) {
        const d = Math.min(60, seconds - s);
        e.advanceTo(t0 + s + d);
        s += d;
        each?.(t0 + s);
        await new Promise((r) => setImmediate(r));
      }
    },
  };
}
