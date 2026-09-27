// FU-2 item 7 (G7d R-7D-5b): in MANUAL an instructor `contractility` (≠ 1) is both ventricles' Emax factor. The
// set-and-hold pressure tracker then holds MAP with the systemic resistance alone, so CO follows the heart, SVR (derived)
// rises and pulse pressure narrows; contractility 1 (the default) leaves the tracker exactly as before.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

const yieldNow = () => new Promise((r) => setImmediate(r));
const m = (a: number[]) => a.reduce((p, q) => p + q, 0) / Math.max(1, a.length);

/** MANUAL at HR 80: targets from 20 s, contractility (if not 1) with them; means over 150–180 s. */
async function manual(c: number, sbp: number, dbp: number, cvp: number) {
  const e = createEngine({ seed: 4, patient: { baseline: { hr: 80 }, sensors: { abp: 'connected', cvp: 'connected' } } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.advanceTo(20);
  e.dispatch(cmd({ type: 'setTarget', variable: 'sbp', value: sbp }));
  e.dispatch(cmd({ type: 'setTarget', variable: 'dbp', value: dbp }));
  e.dispatch(cmd({ type: 'setTarget', variable: 'cvp', value: cvp }));
  if (c !== 1) e.dispatch(cmd({ type: 'setTarget', variable: 'contractility', value: c }));
  for (let t = 60; t <= 180; t += 60) {
    e.advanceTo(t);
    await yieldNow();
  }
  const late = <T extends EngineEvent['type']>(type: T) => ev.filter((x) => x.type === type && (x as { t: number }).t > 150) as Extract<EngineEvent, { type: T }>[];
  const abp = late('measurement').filter((x) => x.values.abpMean?.value != null);
  const r = {
    co: m(late('circ').map((x) => x.co)),
    sys: m(abp.map((x) => x.values.abpSys!.value as number)),
    dia: m(abp.map((x) => x.values.abpDia!.value as number)),
    map: m(abp.map((x) => x.values.abpMean!.value as number)),
    svr: m(late('state').map((x) => x.values.svr as number)),
  };
  console.log(`FU-2 MANUAL contractility ${c} at ${sbp}/${dbp}, CVP ${cvp}: CO ${r.co.toFixed(2)}, ABP ${r.sys.toFixed(0)}/${r.dia.toFixed(0)} (${r.map.toFixed(0)}), SVR ${r.svr.toFixed(2)}`);
  return r;
}

describe('MANUAL contractility acts through the trackers (FU-2 item 7)', () => {
  it('contractility 0.5 at 110/70: CO falls ≥ 20 %, MAP held (± 5), SVR rises, pulse pressure narrows', async () => {
    const a = await manual(1, 110, 70, 6);
    const b = await manual(0.5, 110, 70, 6);
    expect(b.co).toBeLessThanOrEqual(0.8 * a.co);
    expect(Math.abs(b.map - a.map)).toBeLessThanOrEqual(5);
    expect(b.svr).toBeGreaterThan(a.svr * 1.2);
    expect(b.sys - b.dia).toBeLessThan(a.sys - a.dia);
  }, 300_000);
  it('the low-output premise of tables §7 check 20 is reachable: contractility 0.3, CVP 12, 85/55 → MAP 60–72, CO ≤ 4 L/min', async () => {
    const r = await manual(0.3, 85, 55, 12);
    expect(r.map).toBeGreaterThanOrEqual(60);
    expect(r.map).toBeLessThanOrEqual(72);
    expect(r.co).toBeLessThanOrEqual(4);
  }, 300_000);
});
