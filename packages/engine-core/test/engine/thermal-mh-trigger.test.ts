// FU-10 Task A1 (E1; research/14 ET-10a): an MH-susceptible patient given its triggers develops MH by itself — 7f
// publishes the exposure times and agent, 7e starts the MH state it owns with the trigger's onset latency. Rig = the ET
// drug GA (VCV 12 × 600, fixed minute ventilation), no instructor action.
import { describe, expect, it } from 'vitest';
import { drug, ev, FLAG, firstT, GA, rows, st, VENTED } from '../helpers/endo-thermal-rigs.ts';
import { MAN } from '../helpers/blood.ts';

const read = (e: Parameters<Parameters<typeof rows>[3]>[0], endo: Parameters<Parameters<typeof rows>[3]>[1]) => ({
  etco2: st(e).resp.etco2 as number, mh: endo?.mhActivity ?? 0, tc: st(e).resp.temp.tc as number,
});
const MHS = { neuro: { mhSusceptible: true } };

describe('MH from its triggers (MHAUS; Larach 1994/2010; Visoiu 2014)', { timeout: 900_000 }, () => {
  // The rig keeps the minute ventilation FIXED (the band's condition): rocuronium after the succinylcholine wears off,
  // so FU-6's patient-triggered breaths (Task 11, merged) cannot raise the ventilation the hypercapnia would drive.
  it('susceptible + succinylcholine + sevoflurane at 300 s: EtCO2 doubles within 10–30 min of the triggers (main: never)', async () => {
    const r = await rows([...VENTED, ...GA(300, 'sux'), [600, drug('rocuronium', 0.6, 'mg/kg')]], 300 + 40 * 60, 10, read, MHS);
    const base = r.find((x) => x.t === 290)!.etco2;
    const tD = firstT(r, 300, (x) => x.etco2 >= 2 * base);
    console.log(`FU-10 E1 sux: EtCO2 base ${base.toFixed(1)}, doubled at +${((tD - 300) / 60).toFixed(1)} min, activity ${r.at(-1)!.mh} at +40 min`);
    expect(tD - 300).toBeGreaterThanOrEqual(10 * 60);
    expect(tD - 300).toBeLessThanOrEqual(30 * 60);
  });
  it('sevoflurane alone starts it at the agent median (≈ 45 min, Visoiu 2014), later than succinylcholine; a patient who is not susceptible never gets it', async () => {
    const vol = await rows([...VENTED, ...GA(300, 'roc')], 300 + 75 * 60, 30, read, MHS);
    const ctl = await rows([...VENTED, ...GA(300, 'sux')], 300 + 75 * 60, 30, read);
    const on = firstT(vol, 300, (x) => x.mh > 0.05);
    console.log(`FU-10 E1 sevoflurane alone: activity > 0.05 at +${((on - 300) / 60).toFixed(1)} min; not susceptible: max ${Math.max(...ctl.map((x) => x.mh))}`);
    expect(on - 300).toBeGreaterThan(40 * 60);
    expect(on - 300).toBeLessThanOrEqual(60 * 60);
    expect(Math.max(...ctl.map((x) => x.mh))).toBe(0);
  });

  // E134: severity is a SCENARIO input — the phenotype's peak VO2 multiple (the calcium-leak gain), with everything
  // downstream emerging from it. The value was not chosen to make anything appear at a time.
  it('E134 the phenotype is the gain: a fulminant course makes more CO2 and heat than a typical one, from the same activity', async () => {
    const run = async (phenotype?: 'typical' | 'fulminant') => {
      const r = await rows([...VENTED, FLAG, [60, ev({ kind: 'condition', id: 'mh', severity: 1, ...(phenotype ? { phenotype } : {}) })]], 60 + 20 * 60, 60,
        (e, endo) => ({ ...read(e, endo), mhW: st(e).resp.temp.out.mhW as number, peak: st(e).resp.temp.mh?.vo2PeakX as number | undefined }));
      return r.at(-1)!;
    };
    const typical = await run('typical');
    const dflt = await run();
    const ful = await run('fulminant');
    console.log(`E134 phenotype: typical EtCO2 ${typical.etco2.toFixed(0)} mhW ${typical.mhW.toFixed(0)}; fulminant EtCO2 ${ful.etco2.toFixed(0)} mhW ${ful.mhW.toFixed(0)}`);
    expect(typical.peak).toBe(2.5);
    expect(dflt.peak).toBe(2.5); // no phenotype named = typical
    expect(ful.peak).toBe(5);
    expect(ful.mhW / typical.mhW).toBeCloseTo((5 - 1) / (2.5 - 1), 1); // the heat is in the multiple, not in a new constant
    expect(ful.etco2).toBeGreaterThan(typical.etco2);
    expect(ful.tc).toBeGreaterThan(typical.tc);
  });

  it('E134 the phenotype is validated: an unknown name is refused, a multiple outside 1–6 is refused', async () => {
    const { createEngine } = await import('../../src/engine.ts');
    const e = createEngine({ seed: 7, mode: 'modeled', patient: MAN } as never);
    let k = 0;
    const send = (event: Record<string, unknown>) => {
      const r = e.dispatch({ type: 'applyEvent', event, id: `x${k++}`, issuedBy: 'instructor' } as never);
      e.advanceTo(e.now().simT + 1); // the queue is drained on the next advance
      return r;
    };
    expect(send({ kind: 'condition', id: 'mh', severity: 1, phenotype: 'wild' }).accepted).toBe(false);
    expect(send({ kind: 'condition', id: 'mh', severity: 1, vo2PeakX: 12 }).accepted).toBe(false);
    expect(send({ kind: 'condition', id: 'mh', severity: 1, phenotype: 'fulminant' }).accepted).toBe(true);
    expect(send({ kind: 'condition', id: 'mh', severity: 1, vo2PeakX: 3.2 }).accepted).toBe(true);
    expect((st(e).resp.temp.mh as { vo2PeakX: number }).vo2PeakX).toBe(3.2);
  });
});