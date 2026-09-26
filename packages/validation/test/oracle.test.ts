import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { compareRow } from '../src/oracle/compare.ts';
import { loadPulse } from '../src/oracle/pulse-runner.ts';
import { ORACLE_SCENARIOS } from '../src/oracle/scenarios.ts';

const DIR = process.env.PULSE_ORACLE_DIR;
const PULSE_KEYS = { hr: 'HeartRate(1/min)', map: 'MeanArterialPressure(mmHg)', co: 'CardiacOutput(L/min)', cvp: 'MeanCentralVenousPressure(mmHg)', pcwp: 'PulmonaryCapillariesWedgePressure(mmHg)' } as const;

describe.skipIf(!DIR)('Pulse oracle O1–O5 (annex §D; set PULSE_ORACLE_DIR=…/research/pulse-spike/web)', () => {
  for (const sc of ORACLE_SCENARIOS) {
    it(`${sc.id}`, async () => {
      const p = await loadPulse(DIR as string, join(DIR as string, '../bench/drm_names.json'));
      const e = createEngine({ seed: 1, mode: 'modeled', patient: { ageY: 44, sex: 'M', weightKg: 77.1, heightCm: 180, baseline: { hr: 72 } } });
      const ev: EngineEvent[] = [];
      e.on((x) => ev.push(x));
      for (const o of sc.ours) e.dispatch({ id: `o${o.tS}`, issuedBy: 'oracle', type: 'applyEvent', event: o.event as never, atTick: o.tS * 50 });
      const pulseAt: Record<number, Record<string, number>> = {};
      let t = 0;
      const acts = [...sc.pulse];
      for (const at of [sc.baselineS, sc.compareAtS]) {
        while (t < at) {
          while (acts.length && acts[0]!.tS <= t) p.act(acts.shift()!.json);
          p.step(50);
          t += 1;
          if (t % 60 === 0) await new Promise((r) => setImmediate(r));
        }
        pulseAt[at] = p.read();
        e.advanceTo(at);
      }
      const ours = (at: number, k: keyof typeof PULSE_KEYS) => {
        const c = ev.filter((x) => x.type === 'circ' && x.t <= at && x.t > at - 10) as Extract<EngineEvent, { type: 'circ' }>[];
        const s = ev.filter((x) => x.type === 'state' && x.t <= at && x.t > at - 10) as Extract<EngineEvent, { type: 'state' }>[];
        const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
        if (k === 'co') return avg(c.map((x) => x.co));
        if (k === 'map') return avg(s.map((x) => (x.values.dbp ?? 0) + ((x.values.sbp ?? 0) - (x.values.dbp ?? 0)) / 3));
        if (k === 'hr') return avg(s.map((x) => x.values.hr ?? 0));
        if (k === 'cvp') return avg(s.map((x) => x.values.cvp ?? 0));
        return avg(s.map((x) => x.values.pawp ?? 0));
      };
      const verdicts: string[] = [];
      for (const row of sc.rows) {
        const o = row.metric === 'abs' ? ours(sc.compareAtS, row.channel) : ours(sc.compareAtS, row.channel) - ours(sc.baselineS || 10, row.channel);
        const pv = row.metric === 'abs' ? pulseAt[sc.compareAtS]![PULSE_KEYS[row.channel]]! : pulseAt[sc.compareAtS]![PULSE_KEYS[row.channel]]! - pulseAt[sc.baselineS]![PULSE_KEYS[row.channel]]!;
        const verdict = compareRow(o, pv, row);
        console.log(`${sc.id} ${row.channel} ${row.metric}: ours ${o.toFixed(2)} pulse ${pv.toFixed(2)} → ${verdict}${row.note ? ` (${row.note})` : ''}`);
        verdicts.push(verdict);
      }
      expect(verdicts).not.toContain('fail'); // every row is printed before the verdict (a fail is a gate-note finding)
    }, 600_000);
  }
});
