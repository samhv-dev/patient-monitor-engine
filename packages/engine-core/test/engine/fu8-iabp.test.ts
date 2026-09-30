// FU-8 Task A20 (research/20 DV-13d, DV-M5): a correctly timed balloon must not harm, raises coronary perfusion, and
// deflates before the valve opens in MANUAL too. Seed 7, ventilated (ETT + VCV 12 × 600, PEEP 5, FiO2 0.5).
// Before FU-8 (origin/main 3feee6f, research/20): the HFrEF + recent-MI heart arrested at +8.8 min with the balloon (CoPP
// 57.7 → 46.1: the post-deflation dip read as the diastolic pressure; 7 of 63 deflations a minute cut short), and the
// MANUAL cardiogenic-shock balloon deflated 272 ms AFTER the valve opened.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

type St = { rhythm: { id: string; opts: { pulseless?: boolean } }; hemo: { circOut: { qAv: number }; iabp: { inflateAt: number; deflateAt: number }; circ: { cor: { cpp: number }; arrest: unknown } } };
const HFMI = { ageY: 65, sex: 'M', weightKg: 80, conditions: [{ id: 'hfref' }, { id: 'cad', grade: 'recentMI' }] };
function rig(patient: Record<string, unknown>, mode: 'modeled' | 'manual') {
  const e = createEngine({ seed: 7, mode, patient: { ...patient, sensors: { abp: 'connected', cvp: 'connected', pap: 'connected' } } as never });
  let n = 0;
  const send = (body: Record<string, unknown>) => e.dispatch({ id: `i${++n}`, issuedBy: 'test', ...body } as never);
  e.advanceTo(1);
  send({ type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } });
  send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 } });
  return { e, send, st: () => (e as unknown as { st: St }).st };
}

async function hfmi(iabp: boolean) {
  const r = rig(HFMI, 'modeled');
  r.e.advanceTo(400);
  if (iabp) r.send({ type: 'device', action: { device: 'iabp', action: 'start', ratio: 1 } });
  const cpp: number[] = [];
  let arrest = false;
  for (let t = 405; t <= 1500; t += 5) {
    r.e.advanceTo(t);
    const s = r.st();
    if (t >= 460 && t <= 700) cpp.push(s.hemo.circ.cor.cpp);
    if (s.hemo.circ.arrest || s.rhythm.opts.pulseless === true || ['agonal', 'asystole', 'vfCoarse', 'vfFine'].includes(s.rhythm.id)) arrest = true;
    if (t % 60 === 0) await new Promise((res) => setImmediate(res));
  }
  return { arrest, cpp: cpp.reduce((a, b) => a + b, 0) / cpp.length };
}

describe('FU-8 A20: the IABP helps the heart it supports', () => {
  it('HFrEF + recent MI 65 y, IABP 1:1 correctly timed for 18 min: no arrest, and the coronary perfusion pressure is at least the control arm\'s (research/20 DV-13d; before FU-8: arrest at +8.8 min, CoPP 46.1 vs 57.7)', async () => {
    const ctl = await hfmi(false);
    const bal = await hfmi(true);
    console.log(`fu8 A20 DV-13d: arrest control ${ctl.arrest}, IABP ${bal.arrest}; CoPP control ${ctl.cpp.toFixed(1)}, IABP ${bal.cpp.toFixed(1)}`);
    expect(ctl.arrest).toBe(false);
    expect(bal.arrest).toBe(false);
    expect(bal.cpp).toBeGreaterThanOrEqual(ctl.cpp);
  }, 120_000);
  it('MANUAL cardiogenic-shock rig (contractility 0.4, 85/55): the balloon deflation starts 20–150 ms before the next valve opening (tables §8.1; research/20 DV-M5, before FU-8 +272 ms)', async () => {
    const r = rig({ ageY: 60, sex: 'M', weightKg: 80, conditions: [{ id: 'hfref' }] }, 'manual');
    r.e.advanceTo(30);
    for (const [variable, value] of [['contractility', 0.4], ['sbp', 85], ['dbp', 55]] as const) r.send({ type: 'setTarget', variable, value });
    r.e.advanceTo(400);
    r.send({ type: 'device', action: { device: 'iabp', action: 'start', ratio: 1 } });
    r.e.advanceTo(600);
    const opens: number[] = [];
    const pairs = new Map<number, number>();
    let open = false;
    for (let k = 1; k <= 7500; k++) {
      const t = 600 + k * 0.002;
      r.e.advanceTo(t);
      const s = r.st();
      const o = s.hemo.circOut.qAv > 1;
      if (o && !open) opens.push(t);
      open = o;
      if (s.hemo.iabp.inflateAt > 0) pairs.set(s.hemo.iabp.inflateAt, s.hemo.iabp.deflateAt);
      if (k % 500 === 0) await new Promise((res) => setImmediate(res));
    }
    const lags = [...pairs].map(([i, d]) => {
      const nx = opens.find((x) => x > i);
      return nx === undefined ? Number.NaN : 1000 * (d - nx);
    }).filter(Number.isFinite);
    const lag = lags.reduce((a, b) => a + b, 0) / lags.length;
    console.log(`fu8 A20 DV-M5: deflation ${lag.toFixed(0)} ms relative to the next opening (${lags.length} cycles)`);
    expect(lags.length).toBeGreaterThan(10);
    expect(lag).toBeGreaterThanOrEqual(-150);
    expect(lag).toBeLessThanOrEqual(-20);
  }, 120_000);
});
