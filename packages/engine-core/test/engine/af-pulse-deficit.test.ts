// FU-4 Task 17 (ruling 5 / review F14): the AF pulse deficit at 150/min. Target 10–20 % of beats that do not eject
// (the clinical deficit at this rate, research 10 T2). Measured BEFORE the change with every circulation beat counted
// once (deduplicated by onset time): MODELED 7.2 %, MANUAL 9.1 % — the audit's "44 %" (89.5 circulation beats for 150
// QRS/min) was a counting artefact: its 1 Hz loop read the 16-beat buffer by onset time, and a beat is only closed
// (pushed) at the NEXT onset, so every beat whose onset fell in the last RR before a read was never counted.
// Attempt 1 (landed): mechanical restitution of premature supraventricular beats (circ/model.ts REST_TAU_S) —
// MODELED 14.1 %, MANUAL 11.4 %. Rig: adult 40 y 70 kg, ETT + VCV 12 × 500, AF rateBpm 150 from 20 s, beats 80–320 s.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command } from '../../src/index.ts';

let n = 0;
const cmd = (c: Record<string, unknown>) => ({ id: `af${++n}`, issuedBy: 'test', ...c }) as unknown as Command;
type B = { t: number; avOpen: number; sv: number };

async function share(mode: 'modeled' | 'manual'): Promise<number> {
  const e = createEngine({ seed: 7, mode, patient: { ageY: 40, sex: 'M', weightKg: 70 } });
  e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } }));
  e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 } }));
  e.advanceTo(20);
  e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib', opts: { rateBpm: 150 } }));
  const seen = new Map<number, B>();
  for (let t = 21; t <= 320; t++) {
    e.advanceTo(t);
    if (t > 80) for (const b of (e as unknown as { st: { hemo: { circ: { beats: B[] } } } }).st.hemo.circ.beats) seen.set(b.t, b);
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  const bs = [...seen.values()];
  const s = bs.filter((b) => !(b.avOpen >= 0 && b.sv > 1)).length / bs.length;
  console.log(`af-pulse-deficit ${mode}: ${bs.length} beats, non-ejecting ${(100 * s).toFixed(1)} %`);
  return s;
}

describe('FU-4 Task 17: AF 150/min pulse deficit', { timeout: 300_000 }, () => {
  it('MODELED: 10–20 % of beats do not eject — was 7.2 % before mechanical restitution', async () => {
    const s = await share('modeled');
    expect(s).toBeGreaterThanOrEqual(0.1);
    expect(s).toBeLessThanOrEqual(0.2);
  });
  it('MANUAL: 10–20 % of beats do not eject — was 9.1 %', async () => {
    const s = await share('manual');
    expect(s).toBeGreaterThanOrEqual(0.1);
    expect(s).toBeLessThanOrEqual(0.2);
  });
});
