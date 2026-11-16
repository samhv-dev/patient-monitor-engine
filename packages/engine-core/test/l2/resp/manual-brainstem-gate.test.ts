// The brainstem-perfusion gate in MANUAL: the instructor's rr/vt are the perfused patient's pattern; with no flow the
// spontaneous breaths stop (gasps past GASP_ONSET_S, apnoea by GASP_END_S) whatever rate is set, and come back over
// GATE_REOPEN_S once the circulation returns. Mechanical breaths are the machine's and are not gated.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type MonitorEngine } from '../../../src/index.ts';
import { GASP_END_S, GATE_REOPEN_S } from '../../../src/l2/neuro/spont.ts';

let n = 0;
const cmd = (e: MonitorEngine, body: object) => e.dispatch({ id: `g${++n}`, issuedBy: 'test', ...body } as unknown as Command);
const vf = (e: MonitorEngine) => cmd(e, { type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' });
const sinus = (e: MonitorEngine) => cmd(e, { type: 'setRhythm', rhythm: 'sinus', when: 'now' });
async function runTo(e: MonitorEngine, s: number): Promise<void> {
  for (let t = e.now().simT; t < s; t += 30) {
    e.advanceTo(Math.min(s, t + 30));
    await new Promise<void>((r) => setImmediate(r));
  }
}
function rig(): { e: MonitorEngine; breaths: Array<{ t: number; kind: string }>; flags: Array<{ t: number; rr?: string }> } {
  const e = createEngine({ seed: 3, mode: 'manual', patient: { sensors: { ecg: 'on', spo2: 'on', co2: 'on' } } });
  const breaths: Array<{ t: number; kind: string }> = [];
  const flags: Array<{ t: number; rr?: string }> = [];
  e.on((x) => {
    if (x.type === 'breath') breaths.push({ t: x.t, kind: x.kind });
    if (x.type === 'state') flags.push({ t: x.t, rr: (x as { control?: Record<string, string> }).control?.rr });
  });
  return { e, breaths, flags };
}
const between = (b: Array<{ t: number }>, a: number, z: number) => b.filter((x) => x.t > a && x.t <= z).length;

describe('MANUAL: the brainstem-perfusion gate', { timeout: 600_000 }, () => {
  it('VF: spontaneous breathing stops by GASP_END_S and stays stopped although the instructor sets RR 20; rr shows override', async () => {
    const { e, breaths, flags } = rig();
    await runTo(e, 60);
    expect(between(breaths, 0, 60)).toBeGreaterThanOrEqual(12);
    vf(e);
    await runTo(e, 180);
    cmd(e, { type: 'setTarget', variable: 'rr', value: 20 });
    await runTo(e, 420);
    expect(between(breaths, 60 + GASP_END_S, 420)).toBe(0);
    const late = flags.filter((f) => f.t > 200);
    expect(late.length).toBeGreaterThan(200);
    expect(late.every((f) => f.rr === 'override')).toBe(true);
  });
  it('the circulation returns after 2 min: the breaths come back, at the instructor\'s rate once the gate is open', async () => {
    const { e, breaths } = rig();
    await runTo(e, 60);
    vf(e);
    await runTo(e, 180);
    sinus(e);
    await runTo(e, 180 + GATE_REOPEN_S + 60);
    expect(between(breaths, 180 + GATE_REOPEN_S, 180 + GATE_REOPEN_S + 60)).toBeGreaterThanOrEqual(13);
  });
  it('a ventilated patient in VF: the ventilator\'s breaths are delivered at the set rate', async () => {
    const { e, breaths } = rig();
    cmd(e, { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 } });
    await runTo(e, 60);
    vf(e);
    await runTo(e, 420);
    expect(between(breaths, 300, 420)).toBeGreaterThanOrEqual(23);
    expect(between(breaths, 300, 420)).toBeLessThanOrEqual(25);
  });
});
