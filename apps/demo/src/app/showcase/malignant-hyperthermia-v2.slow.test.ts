// showcase-mh-v2 (plan F8; the owner's phase table of 31 October): the MH card in pme-scenario/2 driven on the demo
// path — the run sheet's presses at their sim times (docs/showcase/SHOWCASE-2-RUN-SHEET.md §3) — against the /1 card
// driven on the same path on the same commit (the F0 goldens are local-only, so the reference is re-derived here).
// Asserted: the card validates; no command refused; the engine's course is the /1 card's to the second (the /2 presses
// send the /1 states' onEnter commands, and the condition goes with Induce in its stage group), so any difference in the
// phase times below is the owner's phase rules and their holds, never a different patient; the phases do not
// flap. PRINTED: every phase entry against the /1 state entries (PME_SHOWCASE_PRINT=1 or always below). Asserted since
// the demo-day fixes (brief fix-fv2-mh-demo-ready, decisions D1 and D2), each from the rules, not from a measurement:
// Early signs is entered 20 s after its rule first held (its hold since the owner's ruling of 1 November, brief
// fv2-mh-early-hold-20-nov1: the /1 card's own 20-s settle; it was 60 s, latched by the call, D1), and that rule is the
// same EtCO₂ crossing as /1's earlySigns less /1's 20-s forS, so Early signs comes at /1's earlySigns (08:03), before the
// call at 08:12: on this path the latch (D1) is not reached.
// Since the owner's rules of 1 November (brief fv2-mh-phase-rules-nov1; Recovering = after Treated, EtCO₂ < 45 and not
// rising over 120 s; Recrudescence = after Recovering, EtCO₂ > 45 and rising over 120 s; rising = slope ≥ 1 mmHg/min,
// both at whatever ventilation is set) and the two changes proposed for the owner's ruling the same day (brief
// fv2-mh-treated-rule-hold-nov1: Treated = the dantrolene effect rising, slope over 60 s above 0.02/min; a phase's
// hold counts from when the phase is reachable from the current one), also from the rules: Treated 60 s after its rule
// first held, after Early signs (the first dose's rise passes 0.02/min at 08:57); Recovering 60 s after Treated (its
// rule has held since the call's hyperventilation brought the EtCO₂ down, 08:25: the hold counts from reachability);
// Recrudescence 60 s after its rule first held in Recovering (the climb after the ventilation back, 13:52); the second
// Treated 60 s after its rule held again, after the second dose (19:13; the first dose's effect only decays before it);
// the second Recovering 60 s after its rule held again (the EtCO₂ under 45 after the second dose), before the talk's
// end. Every phase after Early signs holds 60 s, and no phase lasts less than 60 s (unchanged by the 20-s hold: Latent,
// the phase before Early signs, lasts 106 s).
// F3: the same path stopped at the talk's end (24:31) and graded by grade() as the debrief would (final): the table is
// printed; asserted: the call, the hyperventilation, the propofol infusion, dantrolene's first dose and the ventilation
// back met (D3's anchors and precondition), the second dose met in the window Recrudescence opens, calcium, insulin and
// CPR not applicable, no violation. The /1-versus-/2 table itself: mh-v1-v2-table.slow.test.ts.
import { describe, expect, it } from 'vitest';
import { grade, validateScenario, type ScenarioDocV2 } from '@pme/controller/scenario';
import { anyShowcaseDoc, runCard, type Act, type Run } from './harness.ts';

/** The run sheet's demo path, §3 (the talk run's sim times; the stops hold the clock, so they are not in sim time). */
const PATH: Array<{ t: number; v1: string; v2: string }> = [
  { t: 30, v1: 'Premedicate: midazolam 2 mg, fentanyl 100 µg', v2: 'premedicate' },
  { t: 60, v1: 'Preoxygenate: 100 % O₂ by face mask', v2: 'preoxygenate' },
  { t: 240, v1: 'Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg', v2: 'induce' },
  { t: 300, v1: 'Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %', v2: 'intubate' },
  { t: 360, v1: 'Start surgery: rocuronium 0.6 mg/kg', v2: 'startSurgery' },
  { t: 492, v1: 'MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate', v2: 'callCrisis' }, // 8:12
  { t: 512, v1: 'Dantrolene 2.5 mg/kg', v2: 'dantrolene' }, // 8:32
  { t: 832, v1: 'EtCO₂ normal: ventilation back to 12 × 500', v2: 'ventilationBack' }, // 13:52
  { t: 1153, v1: 'Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)', v2: 'dantroleneAgain' }, // 19:13
];
/** The talk ends at 24:31; the run goes on to the hour so a later phase would be printed (none since the rules of 1 Nov). */
const END_S = 3600;
/** The app's poll at ×4 (the run sheet's speed from 7:30). */
const POLL_S = 0.4;
const SLOW = 600_000;

const mmss = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.round(t % 60)).padStart(2, '0')}`;

describe('showcase-mh-v2: the MH card in pme-scenario/2 on the demo path', () => {
  it('validates as pme-scenario/2', () => {
    const r = validateScenario(anyShowcaseDoc('showcase-mh-v2'));
    expect(r.ok ? [] : r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('the run sheet\'s presses drive the phase runner; the course is the /1 card\'s; the phases enter at the printed times without flapping', async () => {
    const v1Acts: Act[] = PATH.map((p) => ({ press: p.v1, t: p.t }));
    const v2Acts: Act[] = PATH.map((p) => ({ press: p.v2, action: p.v2, t: p.t }));
    const a: Run = await runCard('showcase-mh', v1Acts, END_S, undefined, POLL_S);
    const b: Run = await runCard('showcase-mh-v2', v2Acts, END_S, undefined, POLL_S);
    expect(a.pressed.every((x) => !Number.isNaN(x)), JSON.stringify(a.pressed)).toBe(true);
    expect(b.pressed).toEqual(a.pressed);
    expect(a.refused).toEqual([]);
    expect(b.refused).toEqual([]);
    // the same patient: every monitored number and every truth the presenter cannot see, each second
    const strip = (r: Run) => r.rows.map(({ state: _s, ...x }) => x);
    expect(strip(b)).toEqual(strip(a));

    const lines = [`/2 phases on the demo path (presses: ${PATH.map((p) => `${p.v2} ${mmss(p.t)}`).join(', ')}):`];
    for (const [t, id] of b.states) lines.push(`  ${mmss(t)} (${t.toFixed(1)} s)  ${id}`);
    lines.push('/1 states on the same path:');
    for (const [t, id] of a.states) lines.push(`  ${mmss(t)} (${t.toFixed(1)} s)  ${id}`);
    console.log(lines.join('\n'));

    const ids = b.states.map(([, id]) => id);
    expect(ids[0]).toBe('baseline');
    expect(ids).toContain('latent');
    // the holds: no phase lasts less than 60 s (no flapping; Early signs' 20-s hold ends Latent, which lasts 106 s)
    const short: string[] = [];
    for (let i = 1; i < b.states.length; i++) if (b.states[i]![0] - b.states[i - 1]![0] < 60 - 1e-6) short.push(`${ids[i - 1]} → ${ids[i]}`);
    expect(short).toEqual([]);
    expect(b.states.length).toBeLessThan(20);

    // D1 and the rules (the derivations are in the header); one poll of slack either way
    const at = (r: Run, id: string) => r.states.find(([, s]) => s === id)?.[0];
    const rose = (rule: string, from = 0) => b.v2!.edges.find((e) => e.rule === rule && e.value && e.t >= from)?.t;
    const early1 = at(a, 'earlySigns')!;
    const early2 = at(b, 'earlySigns')!;
    const earlyRule = rose('phase:earlySigns', at(b, 'latent'))!;
    expect(early2 - earlyRule, 'Early signs: its 20-s hold from its rule, before the call at 08:12').toBeCloseTo(20, 0);
    expect(Math.abs(early2 - early1 - (20 - 20)), `Early signs ${mmss(early2)} against /1's ${mmss(early1)}`).toBeLessThanOrEqual(2 * POLL_S + 1e-6);
    const treated2 = at(b, 'treated')!;
    expect(treated2 - rose('phase:treated', early2)!, 'Treated: its hold from the rule, which rose after Early signs').toBeCloseTo(60, 0);
    expect(treated2).toBeLessThan(PATH.find((p) => p.v2 === 'dantroleneAgain')!.t);
    // the owner's rules of 1 November (header); nth entry of a phase
    const nth = (id: string, n: number) => b.states.filter(([, s]) => s === id)[n - 1]?.[0];
    const t = (id: string) => PATH.find((p) => p.v2 === id)!.t;
    expect(ids.slice(ids.indexOf('treated'))).toEqual(['treated', 'recovering', 'recrudescence', 'treated', 'recovering']);
    expect(nth('recovering', 1)! - treated2, 'Recovering: its hold from Treated\'s entry, when it became reachable').toBeCloseTo(60, 0);
    expect(rose('phase:recovering', t('callCrisis'))!, 'Recovering\'s rule held from the call\'s hyperventilation').toBeLessThan(t('dantrolene'));
    const recrud = nth('recrudescence', 1)!;
    expect(recrud - rose('phase:recrudescence', t('ventilationBack'))!, 'Recrudescence: its hold from the climb after ventilation back').toBeCloseTo(60, 0);
    const treatedRule2 = rose('phase:treated', recrud)!;
    expect(treatedRule2, 'Treated\'s rule rises again only with the second dose').toBeGreaterThan(t('dantroleneAgain'));
    expect(nth('treated', 2)! - treatedRule2, 'the second Treated: its hold from that rise').toBeCloseTo(60, 0);
    const rec2 = nth('recovering', 2)!;
    const lastRise = (rule: string, before: number) => b.v2!.edges.filter((e) => e.rule === rule && e.value && e.t <= before).at(-1)?.t as number;
    expect(rec2 - Math.max(lastRise('phase:recovering', rec2), nth('treated', 2)!), 'the second Recovering: its hold, from its rule or Treated\'s entry, the later').toBeCloseTo(60, 0);
    expect(rec2, 'the second Recovering before the end pause, 24:24').toBeLessThan(1464);
  }, SLOW);

  it('graded at the talk\'s end (24:31, final): the call, its ventilation and infusion, both dantrolene doses and ventilation back met; K⁺ and CPR not applicable; no violation', async () => {
    const TALK_END_S = 1471;
    const b: Run = await runCard('showcase-mh-v2', PATH.map((p) => ({ press: p.v2, action: p.v2, t: p.t })), TALK_END_S, undefined, POLL_S);
    expect(b.refused).toEqual([]);
    const v2 = b.v2!;
    const g = grade(anyShowcaseDoc('showcase-mh-v2') as ScenarioDocV2, v2.phases, v2.admin, v2.edges, TALK_END_S, { final: true });
    const at = (t?: number) => (t === undefined ? '-' : mmss(t));
    const lines = [`grade() at ${mmss(TALK_END_S)} (final) on the demo path:`];
    for (const a of g.actions) {
      lines.push(`  ${a.id.padEnd(17)} ${a.grade.padEnd(15)} first ${a.firstGrade.padEnd(15)} due ${at(a.dueT)}${a.windowS !== undefined ? `+${a.windowS}s` : ''}  given ${at(a.givenT)}  live "${a.live}"  admin [${a.admin.join(',')}]`);
      for (const l of a.lines) lines.push(`      | ${l}`);
      for (const r of a.repeats) lines.push(`      repeat #${r.n}: ${r.grade}  due ${at(r.dueT)}  given ${at(r.t)}${r.lines.length ? `  (${r.lines.join('; ')})` : ''}`);
    }
    lines.push(`  violations: ${g.violations.length ? g.violations.map((v) => `${mmss(v.t)} ${v.text} (${v.harm})`).join('; ') : 'none'}`);
    for (const o of g.outcomes) lines.push(`  outcome ${o.id}: ${o.grade}${o.t !== undefined ? ` ${mmss(o.t)}` : ''}`);
    for (const j of g.judged) lines.push(`  judged ${j.id}: from ${at(j.fromT)}`);
    const named = ['action:callCrisis:anchor', 'action:ventilationBack:precondition', 'action:dantrolene:repeatWhile', 'action:dantroleneAgain:precondition'];
    for (const n of named) lines.push(`  edges ${n}: ${v2.edges.filter((e) => e.rule === n).map((e) => `${e.value ? '↑' : '↓'}${mmss(e.t)}`).join(' ')}`);
    lines.push(`  phases: ${v2.phases.map((p) => `${p.id} ${mmss(p.t)}`).join(', ')}`);
    console.log(lines.join('\n'));

    const row = (id: string) => g.actions.find((a) => a.id === id)!;
    // D3: the anchor EtCO₂ > 45 for 20 s held at 03:42 (premedicated, room air, before the induction), before any of the
    // call's phases; the window now opens at its first rise after Latent's entry (08:03), so the call at 08:12 is met.
    for (const id of ['callCrisis', 'hyperventilate', 'propofolInfusion']) expect(row(id).grade, id).toBe('met');
    expect(row('callCrisis').dueT).toBeGreaterThan(v2.phases.find((p) => p.id === 'latent')!.t);
    // D3: ventilation back's precondition (EtCO₂ < 40 for 120 s) held 10:26–12:32, before the press at 13:52: met
    expect(row('ventilationBack').grade).toBe('met');
    expect(row('dantrolene').firstGrade).toBe('met'); // the first dose
    // the second dose: its window (D3, 300 s) opens at Recrudescence's entry (14:59), so the press at 19:13 is met, as
    // /1's objective 4; dantrolene's repeat row is met with it
    const recrud = v2.phases.find((p) => p.id === 'recrudescence')!.t;
    expect(row('dantroleneAgain')).toMatchObject({ grade: 'met', dueT: recrud });
    expect(row('dantrolene').grade).toBe('met');
    expect(row('dantrolene').repeats.map((r) => r.grade)).toEqual(['met']);
    expect(row('calcium').grade).toBe('not applicable');
    expect(row('insulin').grade).toBe('not applicable');
    expect(row('cpr').grade).toBe('not applicable');
    expect(g.violations).toEqual([]);
  }, SLOW);
});
