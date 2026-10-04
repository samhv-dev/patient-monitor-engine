// FU-10 Task A3 (E5, E6; research/14 ET-01b, ET-03a; rulings R-4, R-5, R-6): the perioperative course graded on the
// SURGICAL arm (drug GA, draped, the existing open-wound `prep` exposure from incision at +15 min — Sessler's bands
// describe surgical patients); the draped no-wound arm is recorded as a demonstration. 7 h each, seed 7.
import { describe, expect, it } from 'vitest';
import { ev, GA, rows, st, VENTED, type Step } from '../helpers/fu10.ts';

const T = 300;
const H = 3600;
const read = (e: Parameters<Parameters<typeof rows>[3]>[0]) => ({ tc: st(e).resp.temp.tc as number, vasoF: st(e).resp.temp.out.vasoF as number });
const WOUND: Step = [T + 900, ev({ kind: 'thermal7e', exposure: 'prep' })];
// each arm runs once per file (memoised): the three tests share them, which keeps the slow group's wall time down
const memo = new Map<string, ReturnType<typeof course0>>();
const course = (wound: boolean, ageY: number) => {
  const k = `${wound}-${ageY}`;
  if (!memo.has(k)) memo.set(k, course0(wound, ageY));
  return memo.get(k)!;
};
const course0 = async (wound: boolean, ageY: number) => {
  const r = await rows([...VENTED, ...GA(T), ...(wound ? [WOUND] : [])], T + 7 * H, 60, read, { ageY });
  const at = (t: number) => r.reduce((b, x) => (Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b)).tc;
  const v = r.find((x) => x.t > T + 60 && x.vasoF < 0.5);
  return { h1: at(T + H) - at(T), lin: (at(T + 3 * H) - at(T + H)) / 2, tc4h: at(T + 4 * H), onsetH: v ? (v.t - T - 60) / H : NaN, onsetC: v ? v.tc : NaN,
    plateau: at(T + 5 * H) - at(T + 4 * H) };
};

describe('FU-10 E5/E6: Sessler\'s three phases on a surgical patient; the elderly threshold', { timeout: 1_200_000 }, () => {
  it('open wound: hour 1 −1 to −1.5 °C, then −0.3 to −0.5 °C/h, vasoconstriction at 34.5 ± 0.2 °C, then a plateau (±0.1 °C/h)', async () => {
    const s = await course(true, 40);
    const d = await course(false, 40);
    console.log(`FU-10 E5 surgical: h1 ${s.h1.toFixed(2)}, linear ${s.lin.toFixed(3)} °C/h, onset ${s.onsetH.toFixed(2)} h at ${s.onsetC.toFixed(2)}, plateau ${s.plateau.toFixed(3)}; draped (demonstration): h1 ${d.h1.toFixed(2)}, linear ${d.lin.toFixed(3)}, onset ${d.onsetH.toFixed(2)} h at ${d.onsetC.toFixed(2)}`);
    expect(s.h1).toBeLessThanOrEqual(-1);
    expect(s.h1).toBeGreaterThanOrEqual(-1.5);
    expect(s.lin).toBeLessThanOrEqual(-0.3);
    expect(s.lin).toBeGreaterThanOrEqual(-0.5);
    expect(s.onsetC).toBeGreaterThanOrEqual(34.3);
    expect(s.onsetC).toBeLessThanOrEqual(34.7);
    expect(Math.abs(s.plateau)).toBeLessThanOrEqual(0.1);
  });
  // R45 / ruling R-5: the onset TIME on the surgical arm depends on the wound loss (`PREP_EVAP_W_70` 40 W [ENG], the
  // calibration knob, R44) — measured 2.27 h; not tuned here.
  it.fails('open wound: vasoconstriction begins at 3–4 h (Sessler 2000) — measured 2.27 h', async () => {
    const s = await course(true, 40);
    expect(s.onsetH).toBeGreaterThanOrEqual(3);
    expect(s.onsetH).toBeLessThanOrEqual(4);
  });
  it('80 y vs 40 y, same surgery: vasoconstriction ≈ 1 °C lower (Kurz 1993) and a colder core at 4 h', async () => {
    const old = await course(true, 80);
    const young = await course(true, 40);
    console.log(`FU-10 E6: onset ${old.onsetC.toFixed(2)} vs ${young.onsetC.toFixed(2)} °C; core at 4 h ${old.tc4h.toFixed(2)} vs ${young.tc4h.toFixed(2)}`);
    expect(old.onsetC - young.onsetC).toBeLessThanOrEqual(-0.7);
    expect(old.onsetC - young.onsetC).toBeGreaterThanOrEqual(-1.3);
    expect(old.tc4h - young.tc4h).toBeLessThan(-0.2);
  });
});
