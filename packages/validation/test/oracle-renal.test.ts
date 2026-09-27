import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { compareRow } from '../src/oracle/compare.ts';
import { loadPulse, pulseDir } from '../src/oracle/pulse-node.ts';
import { RENAL_ORACLE } from '../src/oracle/renal-scenarios.ts';

const DIR = pulseDir();
const KG = 77.1; // Pulse StandardMale
const PULSE_KEYS = { uop: 'UrineProductionRate(mL/min)', map: 'MeanArterialPressure(mmHg)' } as const;

describe('O11 scenario data', () => {
  it('rows are well formed (times inside the run, tolerances > 0)', () => {
    for (const r of RENAL_ORACLE.rows) {
      expect(r.atS).toBeGreaterThanOrEqual(RENAL_ORACLE.baselineS);
      expect(r.atS).toBeLessThanOrEqual(RENAL_ORACLE.durationS);
      expect(r.tol).toBeGreaterThan(0);
    }
  });
});

describe.skipIf(!DIR)('Pulse oracle O11 — renal hypotension (set PME_PULSE_DIR=…/research/pulse-spike/web)', () => {
  it('O11', async () => {
    const sc = RENAL_ORACLE;
    const p = await loadPulse(DIR as string);
    const e = createEngine({ seed: 1, mode: 'modeled', patient: { ageY: 44, sex: 'M', weightKg: KG, heightCm: 180, baseline: { hr: 72 } } });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x), ['organs']);
    for (const o of sc.ours) e.dispatch({ id: `o${o.tS}`, issuedBy: 'oracle', type: 'applyEvent', event: o.event as never, atTick: o.tS * 50 });
    const times = [...new Set([sc.baselineS, ...sc.rows.map((r) => r.atS)])].sort((a, b) => a - b);
    const pulseAt: Record<number, Record<string, number>> = {};
    let t = 0;
    const acts = [...sc.pulse];
    for (const at of times) {
      while (t < at) {
        while (acts.length && acts[0]!.tS <= t) p.act(acts.shift()!.json);
        p.step(50);
        t += 1;
        if (t % 60 === 0) await new Promise((r) => setImmediate(r));
      }
      pulseAt[at] = p.pull();
      e.advanceTo(at);
    }
    const ours = (at: number, k: keyof typeof PULSE_KEYS) => {
      const w = ev.filter((x) => x.type === 'organs' && x.t <= at && x.t > at - 10) as Extract<EngineEvent, { type: 'organs' }>[];
      const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
      return k === 'uop' ? avg(w.map((x) => (x.kidney.uopMlKgH * KG) / 60)) : avg(w.map((x) => x.brain.mapHead));
    };
    const verdicts: string[] = [];
    for (const row of sc.rows) {
      const k = PULSE_KEYS[row.channel];
      const o = row.metric === 'abs' ? ours(row.atS, row.channel) : ours(row.atS, row.channel) - ours(sc.baselineS, row.channel);
      const pv = row.metric === 'abs' ? pulseAt[row.atS]![k]! : pulseAt[row.atS]![k]! - pulseAt[sc.baselineS]![k]!;
      const verdict = compareRow(o, pv, row);
      console.log(`O11 ${row.channel} ${row.metric} @${row.atS}s: ours ${o.toFixed(3)} pulse ${pv.toFixed(3)} → ${verdict}${row.note ? ` (${row.note})` : ''}`);
      verdicts.push(verdict);
    }
    expect(verdicts).not.toContain('fail'); // every row is printed first (a fail is a gate-note finding, not a tuning target)
  }, 3_600_000); // local-only (skipped in CI)
});
