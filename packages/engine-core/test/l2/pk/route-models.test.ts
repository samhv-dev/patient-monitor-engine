// Routes other than IV (design §9.2; plan F5.2): one mechanism per drug row and route, { F, ka, lagS, src } plus an
// optional local effect. IM dantrolene is F = 0 (the owner's ruling of 2026-10-29 17:00): accepted, no systemic
// effect, one local tissue-injury event, nothing on the monitor. Epinephrine IM stays "route not modelled": no PK source
// read for this engine states both its F and its ka, and a ka back-solved from a peak time would be a fitted constant.
// The `.todo` entries at the end are the "not modelled" register (plan F5.3), listed in docs/guides/known-deviations.md.
import { describe, expect, it } from 'vitest';
import { createEngine, DRUGS, DRUG_IDS, IV_ROUTES, routeHonoured, type EngineEvent } from '../../../src/index.ts';
import { drug, GA, rows, st, VENTED, ev, type Step } from '../../helpers/endo-thermal-rigs.ts';

const eng = () => createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
const give = (e: ReturnType<typeof eng>, event: Record<string, unknown>) => e.dispatch({ id: `d${Math.random()}`, issuedBy: 'test', type: 'applyEvent', event: { kind: 'drug', ...event } } as never) as { accepted: boolean; reason?: string };
const IM_DAN = { drugId: 'dantrolene', dose: 2.5, unit: 'mg/kg', route: 'im' };

describe('route models: the data (one mechanism per row and route, each with its source)', () => {
  it('every route model names its source, is not an IV route, and has F = 0 (no absorption depot is built)', () => {
    const models = DRUG_IDS.flatMap((id) => Object.entries(DRUGS[id]!.routeModels ?? {}).map(([route, m]) => ({ id, route, m: m! })));
    expect(models.map((x) => `${x.id} ${x.route}`)).toEqual(['dantrolene im']);
    for (const { id, route, m } of models) {
      expect(IV_ROUTES, `${id} ${route}`).not.toContain(route);
      expect(m.src.length, `${id} ${route} src`).toBeGreaterThan(0);
      expect(m.F, `${id} ${route}: F > 0 needs a depot with a sourced ka`).toBe(0);
      expect([m.ka, m.lagS], `${id} ${route}: nothing to absorb at F = 0`).toEqual([null, null]);
      if (m.local) expect(m.local.src.length).toBeGreaterThan(0);
    }
  });
  it("IM dantrolene's F = 0 cites the owner's 17:00 ruling; its local effect cites the label's pH", () => {
    const m = DRUGS.dantrolene!.routeModels!.im!;
    expect(m.src).toContain('2026-10-29 17:00');
    expect(m.local!.src).toMatch(/pH approximately 9\.5/);
  });
  it('the engine honours IM dantrolene; epinephrine IM and by the inhaled route stay "route not modelled"', () => {
    expect(routeHonoured('dantrolene', 'im')).toBe(true);
    expect(routeHonoured('epinephrine', 'im')).toBe(false);
    expect(routeHonoured('epinephrine', 'inh')).toBe(false);
    const e = eng();
    expect(give(e, { drugId: 'epinephrine', dose: 0.5, unit: 'mg', route: 'im' })).toMatchObject({ accepted: false, reason: expect.stringMatching(/^epinephrine: route im is not modelled/) });
  });
});

describe('IM dantrolene: accepted, no systemic effect, one local tissue-injury event', () => {
  it('the dose is accepted and raises exactly one drugLocalEffect; dantroleneE stays 0 and no drug state or dose-log entry is made', () => {
    const e = eng();
    const local: Extract<EngineEvent, { type: 'drugLocalEffect' }>[] = [];
    e.on((x: EngineEvent) => { if (x.type === 'drugLocalEffect') local.push(x); }, ['drugLocalEffect']);
    e.advanceTo(5);
    expect(give(e, IM_DAN).accepted).toBe(true);
    let maxE = 0;
    for (let t = 10; t <= 1200; t += 10) {
      e.advanceTo(t);
      maxE = Math.max(maxE, st(e).pk.bus.metabolic.dantroleneE as number);
    }
    expect(maxE).toBe(0);
    expect(st(e).pk.drugs.dantrolene).toBeUndefined();
    expect(local).toHaveLength(1);
    expect(local[0]).toMatchObject({ drugId: 'dantrolene', route: 'im', amount: 175, amountUnit: 'mg', text: expect.stringContaining('pH about 9.5') });
  });
  it('the same dose IV still gives the drug its effect (the IV path is unchanged)', () => {
    const e = eng();
    e.advanceTo(5);
    expect(give(e, { ...IM_DAN, route: 'iv' }).accepted).toBe(true);
    e.advanceTo(600);
    expect(st(e).pk.bus.metabolic.dantroleneE as number).toBeGreaterThan(0);
  });
  it('IM dantrolene takes a bolus only: an IM infusion or a dose over time is refused', () => {
    const e = eng();
    expect(give(e, { drugId: 'dantrolene', dose: 1, unit: 'mg/kg/h', route: 'im', infusion: true })).toMatchObject({ accepted: false, reason: expect.stringMatching(/route im takes a bolus only/) });
    expect(give(e, { ...IM_DAN, overS: 60 })).toMatchObject({ accepted: false, reason: expect.stringMatching(/route im takes a bolus only/) });
  });
  it('an MH crisis given IM dantrolene runs exactly as the untreated crisis (activity, EtCO2, core, HR, every 30 s for 30 min); the same dose IV does not', { timeout: 600_000 }, async () => {
    const read = (e: Parameters<Parameters<typeof rows>[3]>[0], endo: Parameters<Parameters<typeof rows>[3]>[1]) => ({
      mh: endo?.mhActivity ?? 0, etco2: st(e).resp.etco2 as number, tc: st(e).resp.temp.tc as number, hr: st(e).hemo.circ.hr as number,
    });
    const MHS = { neuro: { mhSusceptible: true } };
    const base: Step[] = [...VENTED, ...GA(300, 'sux'), [600, drug('rocuronium', 0.6, 'mg/kg')]];
    const untreated = await rows(base, 300 + 30 * 60, 30, read, MHS);
    const im = await rows([...base, [900, ev({ kind: 'drug', ...IM_DAN })]], 300 + 30 * 60, 30, read, MHS);
    const iv = await rows([...base, [900, drug('dantrolene', 2.5, 'mg/kg')]], 300 + 30 * 60, 30, read, MHS);
    const peak = Math.max(...untreated.map((x) => x.mh));
    console.log(`F5.2 dantrolene 2.5 mg/kg at 900 s: MH activity at +30 min ${untreated.at(-1)!.mh.toFixed(3)} untreated, ${im.at(-1)!.mh.toFixed(3)} IM, ${iv.at(-1)!.mh.toFixed(3)} IV`);
    expect(peak).toBeGreaterThan(0); // the crisis is running
    expect(im).toEqual(untreated);
    expect(iv.at(-1)!.mh).toBeLessThan(untreated.at(-1)!.mh); // the comparison can tell: the same dose IV changes the course
  });
});

// The "not modelled" register (plan F5.3; Q7, the 18:00 ruling): harms and devices the scenario format names that the
// engine does not carry. Each is a known gap, tracked in docs/guides/known-deviations.md ("Tests not run").
describe('not modelled: IM dantrolene and the route models', () => {
  it.todo('IM dantrolene: the tissue injury at the injection site is an event only; the injury itself is not modelled');
  it.todo('IM dantrolene: the creatine kinase rise from the injured muscle is not modelled');
  it.todo('IM dantrolene: the potassium released from the injured muscle is not modelled');
  it.todo('epinephrine IM: route not modelled until a PK source states its bioavailability F and absorption rate ka');
});
