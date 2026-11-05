// showcase-haemorrhage-v2 (plan F9; design §4.2, §11; the owner's rulings of 5 November): the haemorrhage card in
// pme-scenario/2, beside the /1 card (showcase-haemorrhage, untouched, still run by haemorrhage-anaphylaxis.slow.test.ts).
// 1. VF comes from the physiology, never from a press (ruling 1). MEASURED on this card's course with the engine of this
//    build: untreated, with CPR into asystole (the A4 path) and with CPR in the PEA, the engine draws no VF (the arrest's
//    onset draw on seed 7 is the PEA on the running junctional rhythm, and a pulseless heart has no VF hazard: arrest.ts
//    `arrestStep` returns at once while pulseless). So the card has no VF phase and no shock; the rhythm check stops the
//    compressions and changes no rhythm. Asserted: no VF id in any arm, the phases each arm reaches.
// 2. O1 on the A4 path: the /2 card driven at the /1 run's ABSOLUTE press times sends the /1 card's commands, so the
//    engine's course is the /1 card's second by second up to the first rhythm check, where the /1 card sets VF and the
//    /2 card does not. From there the courses part (explained in the F9 PR): /1 shocks the card's VF twice (the second
//    shock leaves an organised rhythm that regains its pulse); /2's patient stays in asystole, which this model never
//    turns back into a pulse (arrest.ts `roscStep`: "asystole still stays"), so on the demo's timing there is no ROSC.
// 3. The correspondence table (plan §F9, the acceptance): grade() on the A4 path at 25:00 (final), printed, each row
//    asserted as measured. The rows /1 never judged go to the owner with their grade.
import { describe, expect, it } from 'vitest';
import { grade, validateScenario, type ScenarioDocV2 } from '@pme/controller/scenario';
import { anyShowcaseDoc, first, runCard, type Act, type Run, type Sample } from './harness.ts';

const V2 = 'showcase-haemorrhage-v2';
const END_S = 1500;
const SLOW = 1_800_000;
const VF = /^(vfCoarse|vfFine|vtPoly|torsades)$/;
const mmss = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.round(t % 60)).padStart(2, '0')}`;

/** The /1 card's E132 kit-round path (haemorrhage-anaphylaxis.slow.test.ts HAEM_PATH(30, 60), copied: a test file is not
 *  imported). */
const CPR1 = 'Start CPR: compressions, bag via the tube 10/min, FiO₂ 1.0';
const V1_PATH: Act[] = [
  { press: 'Oxygen by face mask, FiO₂ 1.0', t: 30 },
  { press: 'Intubate and ventilate, FiO₂ 1.0', t: 60 },
  { press: CPR1, when: (s) => s.state === 'asystole', delayS: 15 },
  { press: 'Surgeon controls the bleeding; massive transfusion: 1 L warmed crystalloid, then red cells and plasma by rapid infuser; TXA 1 g', when: (s) => s.state === 'cpr', delayS: 10 },
  { press: 'Epinephrine 1 mg', when: (s) => s.state === 'cprRunning', delayS: 10 },
  { press: 'Rhythm check', when: (s) => s.state === 'cprRunning', delayS: 108 },
  { press: 'charge', send: { kind: 'defib', action: 'charge', energyJ: 200 }, when: (s) => s.state === 'vf', delayS: 3 },
  { press: 'shock', send: { kind: 'defib', action: 'shock', energyJ: 200 }, when: (s) => s.state === 'vf', delayS: 12 },
  { press: 'Epinephrine 1 mg', when: (s) => s.state === 'postShock1', delayS: 70 },
  { press: 'Rhythm check', when: (s) => s.state === 'postShock1Running', delayS: 48 },
  { press: 'charge', send: { kind: 'defib', action: 'charge', energyJ: 200 }, when: (s) => s.state === 'vf2', delayS: 3 },
  { press: 'shock', send: { kind: 'defib', action: 'shock', energyJ: 200 }, when: (s) => s.state === 'vf2', delayS: 12 },
  { press: 'Rhythm check: pulse back, stop CPR', when: (s) => s.state === 'postShock2', delayS: 120 },
];
/** The /2 presses at the /1 run's absolute times `p` (V1_PATH's order): no charge and no shock (no VF: nothing to shock);
 *  the compressions resumed by the CPR press when the /1 card resumed them (with each shock); no stop (no pulse back). */
const v2Path = (p: number[]): Act[] => [
  { press: 'oxygen', action: 'oxygen', t: p[0] as number },
  { press: 'intubate', action: 'intubate', t: p[1] as number },
  { press: 'cpr', action: 'cpr', t: p[2] as number },
  { press: 'sourceControl', action: 'sourceControl', t: p[3] as number },
  { press: 'massiveTransfusion', action: 'massiveTransfusion', t: p[3] as number },
  { press: 'txa', action: 'txa', t: p[3] as number },
  { press: 'epinephrine', action: 'epinephrine', t: p[4] as number },
  { press: 'rhythmCheck', action: 'rhythmCheck', t: p[5] as number },
  { press: 'cpr (resume)', action: 'cpr', t: p[7] as number },
  { press: 'epinephrine', action: 'epinephrine', t: p[8] as number },
  { press: 'rhythmCheck', action: 'rhythmCheck', t: p[9] as number },
  { press: 'cpr (resume)', action: 'cpr', t: p[11] as number },
];

/** A run with the rhythm ids the engine drew (state events), in order with their sim time. */
async function withRhythms(id: string, acts: readonly Act[], untilS: number): Promise<Run & { rhythms: Array<[number, string]> }> {
  const rhythms: Array<[number, string]> = [];
  const r = await runCard(id, acts, untilS, (e) => {
    const x = e as { type: string; t?: number; rhythm?: { id: string } };
    if (x.type === 'state' && x.rhythm && x.rhythm.id !== rhythms.at(-1)?.[1]) rhythms.push([x.t ?? 0, x.rhythm.id]);
  });
  return Object.assign(r, { rhythms });
}
const phaseIds = (r: Run) => r.states.map(([, s]) => s);
const words = (r: Run & { rhythms: Array<[number, string]> }) =>
  `phases ${r.states.map(([t, s]) => `${s} ${mmss(t)}`).join(', ')}; rhythms ${r.rhythms.map(([t, s]) => `${s} ${mmss(t)}`).join(', ')}`;

/** Every `afterS` after the pulse loss + `delayS`: the presses of a team that starts CPR in the PEA. */
const afterLoss = (delayS: number) => {
  let tl = Number.NaN;
  return (s: Sample) => {
    if (!s.pulse && Number.isNaN(tl)) tl = s.t;
    return !Number.isNaN(tl) && s.t >= tl + delayS;
  };
};
const promptPath = (): Act[] => {
  const w = afterLoss(10);
  const acts: Act[] = [
    { press: 'oxygen', action: 'oxygen', t: 30 }, { press: 'intubate', action: 'intubate', t: 60 },
    { press: 'cpr', action: 'cpr', when: w }, { press: 'callForHelp', action: 'callForHelp', when: w },
    { press: 'sourceControl', action: 'sourceControl', when: w, delayS: 10 }, { press: 'massiveTransfusion', action: 'massiveTransfusion', when: w, delayS: 10 }, { press: 'txa', action: 'txa', when: w, delayS: 10 },
    { press: 'epinephrine', action: 'epinephrine', when: w, delayS: 20 },
  ];
  // the 2-min rhythm checks, compressions resumed 10 s later while there is no pulse; at the first check with a pulse, stop
  for (let k = 1; k <= 4; k++) {
    acts.push({ press: 'rhythmCheck', action: 'rhythmCheck', when: (s) => w(s) && s.state.startsWith('arrest'), delayS: 120 * k });
    acts.push({ press: 'cpr (resume)', action: 'cpr', when: (s) => w(s) && s.state.startsWith('arrest'), delayS: 120 * k + 10 });
  }
  acts.push({ press: 'stopCpr', action: 'stopCpr', when: (s) => s.state === 'rosc', delayS: 10 });
  return acts;
};

describe('showcase-haemorrhage-v2: the haemorrhage card in pme-scenario/2', () => {
  it('validates as pme-scenario/2 with no warning', () => {
    const r = validateScenario(anyShowcaseDoc(V2));
    expect(r.ok ? [] : r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  // VF from the physiology (owner, 5 November): one run per arm, each its own test (the four runs in one test passed
  // 900 s on a loaded machine)
  const noVf = (name: string, r: Run & { rhythms: Array<[number, string]> }) => {
    console.log(`VF measurement, ${name}: ${words(r)}; pulse lost ${mmss(first(r.rows, (s) => !s.pulse)?.t ?? Number.NaN)}`);
    expect(r.refused, name).toEqual([]);
    expect(r.pressed.filter((x) => Number.isNaN(x)), name).toEqual([]);
    expect(r.rhythms.filter(([, id]) => VF.test(id)), `${name}: a VF the physiology drew; the card then needs its VF phase (ruling 1)`).toEqual([]);
  };
  it('VF measurement, untreated to 30:00: no VF; PEA decays to asystole, which stays', async () => {
    const r = await withRhythms(V2, [{ press: 'oxygen', action: 'oxygen', t: 30 }, { press: 'intubate', action: 'intubate', t: 60 }], 1800);
    noVf('untreated to 30:00', r);
    expect(phaseIds(r)).toEqual(['bleeding', 'decompensating', 'arrestPea', 'arrestAsystole']);
  }, SLOW);
  it('VF measurement, the A4 path (CPR 15 s into asystole) to 25:00: no VF, no ROSC; the /1 card\'s VF is its own two', async () => {
    const a = await withRhythms('showcase-haemorrhage', V1_PATH, END_S);
    const r = await withRhythms(V2, v2Path(a.pressed), END_S);
    noVf('the A4 path to 25:00', r);
    expect(a.rhythms.filter(([, id]) => VF.test(id)).length).toBe(2);
    expect(phaseIds(r)).toEqual(['bleeding', 'decompensating', 'arrestPea', 'arrestAsystole']);
    expect(r.rows.filter((s) => s.t > a.pressed[2]! && s.pulse)).toEqual([]);
  }, SLOW);
  it('VF measurement, CPR 10 s after the pulse loss to 25:00: no VF; ROSC from the PEA, held 120 s into Post-resuscitation', async () => {
    const r = await withRhythms(V2, promptPath(), END_S);
    noVf('CPR 10 s after the pulse loss to 25:00', r);
    expect(phaseIds(r)).toEqual(['bleeding', 'decompensating', 'arrestPea', 'rosc', 'postResuscitation']);
    const rosc = r.states.find(([, s]) => s === 'rosc')![0];
    expect(r.states.find(([, s]) => s === 'postResuscitation')![0] - rosc).toBeCloseTo(120, 0);
  }, SLOW);

  it('O1: on the A4 path the engine\'s course is the /1 card\'s second by second up to the first rhythm check (where /1 sets VF)', async () => {
    const a = await runCard('showcase-haemorrhage', V1_PATH, END_S);
    expect(a.pressed.every((x) => !Number.isNaN(x)), JSON.stringify(a.pressed)).toBe(true);
    const b = await runCard(V2, v2Path(a.pressed), END_S);
    expect(b.refused).toEqual([]);
    expect(b.pressed.every((x) => !Number.isNaN(x))).toBe(true);
    const check1 = a.pressed[5] as number;
    const strip = (r: Run) => r.rows.filter((s) => s.t < check1).map(({ state: _s, ...x }) => x);
    expect(strip(b)).toEqual(strip(a));
    // the first second that differs is the check's own (the /1 card's VF)
    const diff = b.rows.find((s, i) => s.t >= check1 && JSON.stringify({ ...s, state: '' }) !== JSON.stringify({ ...a.rows[i], state: '' }));
    console.log(`O1: identical to ${mmss(check1)} (the first rhythm check); first difference at ${diff ? mmss(diff.t) : 'none'} (/2 rhythm ${diff?.rhythm}, /1 ${a.rows.find((s) => s.t === diff?.t)?.rhythm})`);
    const lines = ['/1 states on the A4 path:', ...a.states.map(([t, s]) => `  ${mmss(t)} (${t.toFixed(1)} s) ${s}`), '/2 phases on the same presses:', ...b.states.map(([t, s]) => `  ${mmss(t)} (${t.toFixed(1)} s) ${s}`)];
    console.log(lines.join('\n'));
  }, SLOW);

  it('the correspondence table (plan §F9): grade() on the A4 path at 25:00, final', async () => {
    const a = await runCard('showcase-haemorrhage', V1_PATH, END_S);
    const b = await runCard(V2, v2Path(a.pressed), END_S);
    const v2 = b.v2!;
    const doc = anyShowcaseDoc(V2) as ScenarioDocV2;
    const g = grade(doc, v2.phases, v2.admin, v2.edges, END_S, { final: true });
    const at = (t?: number) => (t === undefined ? '-' : mmss(t));
    const lossT = first(a.rows, (s) => !s.pulse)!.t;
    const roscT1 = first(a.rows, (s) => s.pulse, lossT)?.t;
    const lines = [
      `the /1 card on this path: pulse lost ${mmss(lossT)}, CPR ${mmss(a.pressed[2]!)} (+${Math.round(a.pressed[2]! - lossT)} s: objective 2 ${a.pressed[2]! - lossT <= 30 ? 'met' : 'not met'}), ROSC ${roscT1 === undefined ? 'never' : mmss(roscT1)}, stop ${mmss(a.pressed[12]!)} (objective 3 ${roscT1 !== undefined && a.pressed[12]! - roscT1 <= 120 ? 'met' : 'not met'})`,
      `grade() on the /2 card at ${mmss(END_S)} (final):`,
    ];
    for (const r of g.actions) {
      lines.push(`  ${r.id.padEnd(19)} ${r.grade.padEnd(15)} first ${r.firstGrade.padEnd(15)} due ${at(r.dueT)}${r.windowS !== undefined ? `+${r.windowS}s` : ''}  given ${at(r.givenT)}  live "${r.live}"`);
      for (const l of r.lines) lines.push(`      | ${l}`);
      for (const x of r.repeats) lines.push(`      repeat #${x.n}: ${x.grade}  due ${at(x.dueT)}  given ${at(x.t)}${x.lines.length ? `  (${x.lines.join('; ')})` : ''}`);
    }
    for (const j of g.judged) lines.push(`  judged ${j.id}: clock from ${at(j.fromT)}`);
    lines.push(`  violations: ${g.violations.length ? g.violations.map((v) => `${mmss(v.t)} ${v.text}`).join('; ') : 'none'}`);
    lines.push(`  phases: ${v2.phases.map((p) => `${p.id} ${mmss(p.t)}`).join(', ')}`);
    console.log(lines.join('\n'));

    const row = (id: string) => g.actions.find((x) => x.id === id)!;
    const cprGap = a.pressed[2]! - lossT;
    // objective 2: CPR at +271 s, past the 2-min fail limit (ruling 2): failed though started
    expect(cprGap).toBeGreaterThan(120);
    expect(row('cpr')).toMatchObject({ grade: 'failed', givenT: a.pressed[2] });
    // objective 3 and its recognition: no ROSC on this path (asystole stays), so neither applies
    expect(row('stopCpr').grade).toBe('not applicable');
    expect(g.judged.find((j) => j.id === 'recogniseRosc')!.fromT).toBeUndefined();
    // objective 1: the judged PEA clock from the displayed ART below 25 for 10 s, the /1 card's own PEA state
    const pea1 = a.states.find(([, s]) => s === 'pea')![0];
    expect(Math.abs(g.judged.find((j) => j.id === 'recognisePea')!.fromT! - pea1)).toBeLessThanOrEqual(1);
    // the rows /1 never judged: as measured (printed above; the PR's table)
    for (const id of ['oxygen', 'intubate', 'bag', 'sourceControl', 'massiveTransfusion', 'txa']) expect(row(id).grade, id).toBe('met');
    expect(row('callForHelp').grade).toBe('failed'); // never pressed on the /1 path
    const epi = row('epinephrine');
    expect(epi.firstGrade).toBe('met');
    const interval = a.pressed[8]! - a.pressed[4]!;
    expect(epi.repeats[0]).toMatchObject({ n: 2, t: a.pressed[8], grade: interval < 180 ? 'deviation' : interval <= 300 ? 'met' : 'overdue' });
    expect(g.violations).toEqual([]);
  }, SLOW);
});
