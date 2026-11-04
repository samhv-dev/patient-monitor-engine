// Decision D4 (review S1) on the MH /2 card: Arrest and ROSC are exempt from the 60-s hold (a pulseless patient is shown
// pulseless at once), and the CPR row is open in every phase, its window running from the model's pulse loss, so a
// press from its row can be in time. Pure: the phase runner and grade() on the card, no engine.
import { describe, expect, it } from 'vitest';
import { grade, PhaseRunner, type Administration, type PhaseEntry, type RuleEdge, type RunnerInputV2, type ScenarioDocV2 } from '@pme/controller/scenario';
import { phaseRowsOf } from '../card-read.ts';
import { keyTimes } from '../debrief-moments.ts';
import { drugWords } from '../glossary.ts';
import { emptyRun, type RunData } from '../record.ts';
import { anyShowcaseDoc } from './harness.ts';

const doc = anyShowcaseDoc('showcase-mh-v2') as ScenarioDocV2;
const sig = (pulse: boolean): RunnerInputV2 => ({ kind: 'signals', signals: { pulse, dantroleneE: 0, setMinuteVentilationLMin: 6, map: pulse ? 80 : 20, mhActivity: 0, mhExcess: null } });

describe('showcase-mh-v2: Arrest at once, CPR from the pulse loss in every phase (D4)', () => {
  it('Arrest and ROSC carry no hold; Early signs holds 20 s, the /1 card\'s own settle for its early signs (EtCO₂ past 45 for 20 s; the owner\'s ruling of 1 November); every other phase but Baseline keeps the owner\'s 60 s', () => {
    expect(doc.phases.filter((p) => p.holdS === undefined).map((p) => p.id)).toEqual(['baseline', 'arrest', 'rosc']);
    expect(Object.fromEntries(doc.phases.filter((p) => p.holdS !== undefined).map((p) => [p.id, p.holdS]))).toEqual({
      latent: 60,
      earlySigns: 20,
      established: 60,
      treated: 60,
      recovering: 60,
      recrudescence: 60,
    });
  });

  it('a pulse loss in Baseline enters Arrest on the next advance, and its return enters ROSC at once', () => {
    const r = new PhaseRunner(doc);
    r.start(0);
    for (let t = 1; t <= 100; t++) r.advance(t, [sig(t < 50 || t >= 80)]);
    expect(r.phases.map((p) => [p.id, p.t])).toEqual([['baseline', 0], ['arrest', 50], ['rosc', 80]]);
  });

  it('the CPR row is a row of every phase; a press 20 s after a pulse loss in Latent is met', () => {
    for (const p of doc.phases) expect(phaseRowsOf(doc, p.id).some((row) => row.kind === 'step' && row.actionId === 'cpr'), p.id).toBe(true);
    const phases: PhaseEntry[] = [{ id: 'baseline', t: 0, exitT: 400, rule: 'initial' }, { id: 'latent', t: 400, rule: 'enter:latent' }];
    const edges: RuleEdge[] = [{ rule: 'pulseLoss', t: 600, value: true }];
    const admin: Administration[] = [{ seq: 1, t: 620, source: 'action', actionId: 'cpr', kind: 'cpr', settings: { active: 1, rate: 110 }, result: { accepted: true } }];
    const cpr = grade(doc, phases, admin, edges, 700, { final: true }).actions.find((a) => a.id === 'cpr');
    expect(cpr).toMatchObject({ grade: 'met', dueT: 600, givenT: 620 });
    expect(grade(doc, phases, [], [], 700, { final: true }).actions.find((a) => a.id === 'cpr')?.grade).toBe('not applicable');
  });
});

// The owner's rules of 1 November (brief fv2-mh-phase-rules-nov1): Recovering after Treated when EtCO₂ is under 45 and
// not rising over 120 s; Recrudescence after Recovering when EtCO₂ is above 45 and rising over 120 s; rising = the
// least-squares slope at least 1 mmHg/min (2 mmHg over the 120 s), not rising its negation; both read EtCO₂ at whatever
// ventilation is set (no unchanged-ventilation guard) and no MH activity. Proposed the same day for the owner's ruling
// (brief fv2-mh-treated-rule-hold-nov1): Treated = a dose coming in, the dantrolene effect rising (its slope over 60 s
// above 0.02/min), false while the drug only decays; and a phase's 60-s hold counts from when the phase is reachable.
// Pure: the phase runner on the card.
describe('showcase-mh-v2: Recovering and Recrudescence on EtCO₂ at the set ventilation (owner, 1 November); Treated on a dose coming in (proposal)', () => {
  const ph = (id: string) => doc.phases.find((p) => p.id === id)!;
  it('the rules read EtCO₂ only and the dantrolene effect\'s rise; Recrudescence is reached from Recovering (and ROSC), no longer from Treated', () => {
    expect(ph('recovering').enter).toEqual({ all: [{ value: { var: 'etco2', op: '<', value: 45 } }, { slope: { var: 'etco2', op: '<', perMin: 1, overS: 120 } }] });
    expect(ph('recrudescence').enter).toEqual({ all: [{ value: { var: 'etco2', op: '>', value: 45 } }, { slope: { var: 'etco2', op: '>=', perMin: 1, overS: 120 } }] });
    expect(ph('treated').enter).toEqual({ slope: { var: 'dantroleneE', op: '>', perMin: 0.02, overS: 60 } });
    expect(ph('treated').next).toEqual(['recovering', 'arrest']);
    expect(doc.phases.filter((p) => p.next?.includes('recrudescence')).map((p) => p.id)).toEqual(['recovering', 'rosc']);
    for (const id of ['treated', 'recovering', 'recrudescence']) expect(ph(id).holdS, id).toBe(60);
  });

  it('a dose\'s rise is Treated; Recovering 60 s after Treated; the climb is Recrudescence; the second Treated waits for the second dose', () => {
    const r = new PhaseRunner(doc);
    r.start(0);
    // the MH active from 0. The dantrolene effect: a first dose rising 0.06/min from 200 s to 400 s, then decaying slowly
    // (−0.0006/min, as the drug's tail); a second dose rising 0.03/min from 650 s. EtCO₂ 40 flat at 12 L/min, then from
    // 400 s at 6 L/min climbing 3 mmHg/min (45 at 500 s)
    const dantE = (t: number) => (t < 200 ? 0 : t < 400 ? 0.001 * (t - 200) : t < 650 ? 0.2 - 1e-5 * (t - 400) : 0.1975 + 0.0005 * (t - 650));
    const etco2 = (t: number) => (t < 400 ? 40 : 40 + 0.05 * (t - 400));
    for (let t = 1; t <= 800; t++) {
      r.advance(t, [
        { kind: 'values', rank: 3, values: { etco2: etco2(t), hr: 80 } },
        { kind: 'signals', signals: { pulse: true, dantroleneE: dantE(t), setMinuteVentilationLMin: t < 400 ? 12 : 6, map: 80, mhActivity: 0.3, mhExcess: 1 } },
      ]);
    }
    const at = (id: string, n = 1) => r.phases.filter((p) => p.id === id)[n - 1]?.t;
    const rule = (name: string, from: number) => r.edges.find((e) => e.rule === name && e.value && e.t >= from)?.t as number;
    const fell = (name: string, from: number) => r.edges.find((e) => e.rule === name && !e.value && e.t >= from)?.t as number;
    expect(r.phases.map((p) => p.id)).toEqual(['baseline', 'latent', 'treated', 'recovering', 'recrudescence', 'treated']);
    // Treated: 60 s after the first dose's rise began (Treated is reachable from Latent)
    expect(rule('phase:treated', 0)).toBeGreaterThan(200);
    expect(at('treated')! - rule('phase:treated', 0)).toBe(60);
    // Recovering's rule held long before (EtCO₂ flat from the first full 120-s window), but its hold counts from when it
    // became reachable: 60 s after Treated, not one advance after it
    expect(rule('phase:recovering', 0) + 60).toBeLessThan(at('treated')!);
    expect(at('recovering')! - at('treated')!).toBe(60);
    // the rule ignores the ventilation change at 400 s; it holds once EtCO₂ passes 45 with the slope at 3 mmHg/min
    expect(rule('phase:recrudescence', 400)).toBe(501);
    expect(at('recrudescence')).toBe(561);
    // Treated's rule fell with the first dose's rise (the decay is not a dose coming in) and holds again only with the
    // second dose's: the second Treated is 60 s after that rise, not one advance after Recrudescence
    expect(fell('phase:treated', 400)).toBeLessThan(at('recrudescence')!);
    expect(rule('phase:treated', at('recrudescence')!)).toBeGreaterThan(650);
    expect(at('treated', 2)! - rule('phase:treated', 650)).toBe(60);
  });
});

// The Debrief's recognition clock (brief fv2-debrief-recognition-clock-nov1, the coordinator's ruling the same day): the
// judged row's display rule is the Early signs phase's entry (`phaseEntered`), so "Recognition (instructor's tick)"
// counts from the moment the strip shows Early signs (its rule held through its 20-s hold), as the /1 card's counts from
// its "early signs" state (EtCO₂ > 45 for 20 s); it was a bare EtCO₂ > 45, which the premedicated, then induced patient
// crosses before intubation (46 at 03:51 in the kit round), five minutes before the MH shows. Pure: the phase runner,
// grade() and keyTimes() on the card, synthetic inputs in the shape of the demo path.
describe('showcase-mh-v2: the recognition clock starts at the Early signs entry (the /1 card\'s early signs)', () => {
  // EtCO₂ 46 at 03:51–04:13 before the ventilator (no set ventilation); 38 on it from 05:00; from 06:00 the MH: EtCO₂
  // climbing 4.1 mmHg/min (past 45 at 07:43, as on the demo path), HR rising, MH activity on. The tick at 08:12, the run sheet's call.
  const etco2 = (t: number) => (t >= 231 && t <= 253 ? 46 : t < 360 ? 38 : 38 + 0.068 * (t - 360));
  const hr = (t: number) => 64 + 0.03 * Math.max(0, t - 360);
  const TICK = 492;
  function runOf(card: ScenarioDocV2): RunData {
    const r = new PhaseRunner(card);
    r.start(0);
    for (let t = 1; t <= 600; t++) {
      const v = { etco2: etco2(t), hr: hr(t) };
      r.advance(t, [
        { kind: 'values', rank: 3, values: v },
        { kind: 'values', rank: 2, values: v },
        { kind: 'signals', signals: { pulse: true, dantroleneE: 0, setMinuteVentilationLMin: t < 300 ? null : 6, map: 80, mhActivity: t < 360 ? 0 : 0.05, mhExcess: null } },
      ]);
    }
    return {
      ...emptyRun('M 35 y 80 kg', 80, 0), doc: card, format: 2, phases: [...r.phases], admin: [], edges: [...r.edges],
      rows: [{ t: 0, kind: 'scenario', text: 'Scenario loaded: MH' }, { t: TICK, kind: 'note', text: `Objective met: ${drugWords(card.judged?.[0]?.text ?? '')}` }],
      samples: [],
    };
  }
  const rec = (d: RunData) => keyTimes(d).find((k) => k.id === 'recognition');
  const rose = (d: RunData, rule: string) => d.edges?.find((e) => e.rule === rule && e.value)?.t;

  it('the judged row\'s display rule is the Early signs phase\'s entry, the phase written once', () => {
    expect(doc.judged?.find((j) => j.kind === 'recognition')?.display).toEqual({ phaseEntered: 'earlySigns' });
  });

  it('a threshold that held before the MH does not start the recognition clock; the Early signs entry does', () => {
    const d = runOf(doc);
    const rule = rose(d, 'phase:earlySigns') as number;
    expect(rule).toBe(463); // 07:43: EtCO₂ past 45, rising at the set ventilation, HR rising
    const entry = d.phases?.find((p) => p.id === 'earlySigns')?.t as number;
    expect(entry).toBe(rule + 20); // 08:03, after its 20-s hold: the strip turns to Early signs
    expect(rose(d, 'judged:nameMh')).toBe(entry);
    expect(rec(d)).toEqual({ id: 'recognition', label: "Recognition (instructor's tick)", fromT: entry, fromLabel: 'early signs', toT: TICK, state: 'measured' });
    // the card as it was (a bare EtCO₂ > 45 on the display): the clock from the pre-intubation 46, minutes before the signs
    const bare = structuredClone(doc);
    bare.judged![0]!.display = { value: { var: 'etco2', op: '>', value: 45 } };
    expect(rec(runOf(bare))).toMatchObject({ fromT: 231, fromLabel: 'etco2 > 45', toT: TICK });
  });
});
