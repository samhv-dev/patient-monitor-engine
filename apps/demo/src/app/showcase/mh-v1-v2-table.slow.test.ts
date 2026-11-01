// The /1-versus-/2 MH table (brief fv2-mh-phase-rules-nov1): one re-runnable measurement that prints, for the run of
// show's demo path, the phase-entry times of the /1 card (showcase-mh) and the /2 card (showcase-mh-v2), what the
// strip reads at the talk's four pauses, and the Debrief's graded rows of each card at the end pause. It exists so the
// table can be regenerated after an engine change (both cards' times would shift) without redoing the work:
//   PME_TEST_SET=showcase npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/showcase/mh-v1-v2-table.slow.test.ts
// MH_TABLE_V2=<showcase card id> measures another /2 card file of this folder in place of showcase-mh-v2 (a variant
// under study). MH_TABLE_CALL=earlySigns presses the call at the /2 card's first Early signs reading (as a team that
// waits for the strip does: the kit round) and dantrolene 20 s after it (the run sheet's gap), instead of at the run
// sheet's 08:12 and 08:32; the other presses stay at their run-sheet times, and the /1 card is pressed at the same
// times. MH_TABLE_EARLY_HOLD=<s> measures the /2 card with Early signs' hold at <s> seconds instead of the card's 20 (a
// variant held in memory; the card file is unchanged; 60 is the hold before the owner's ruling of 1 November). Section 4 is the hyperventilation's EtCO₂ and the ventilation-back
// precondition (EtCO₂ < 40 for 120 s, truth). PRINT ONLY: the times are pinned in malignant-hyperthermia(-v2).slow.test.ts; this file asserts only that
// every press was taken, nothing was refused, and both cards drove the same patient.
// /1's Debrief rows are objectives() on the run record wired as AppSession wires it (the Debrief's own reader); /2's are
// grade() on the phase runner's timeline, record and edges, final, as the Debrief grades after "Finish the case". The
// phase times of both cards come from the same harness loop (harness.ts runCard); the host-wired /1 run can differ from
// it by about a second (its presses go through the HostSession), and its states are printed beside.
import { createEngine } from '@pme/engine-core';
import { createInProcessHub, HostSession, manualLabel, type HostTarget } from '@pme/controller';
import { engineOptionsOf, grade, ScenarioDriver, validateScenario, type ScenarioDoc, type ScenarioDocV2 } from '@pme/controller/scenario';
import { expect, it } from 'vitest';
import { objectives } from '../debrief.ts';
import { RunRecord } from '../record.ts';
import { anyShowcaseDoc, runCard, type Act } from './harness.ts';

/** The run sheet's demo path (the presses of malignant-hyperthermia-v2.slow.test.ts): /1 button label, /2 action id. */
const PATH: Array<{ t: number; v1: string; v2: string }> = [
  { t: 30, v1: 'Preoxygenate: 100 % O₂ by face mask', v2: 'preoxygenate' },
  { t: 60, v1: 'Premedicate: midazolam 2 mg, fentanyl 100 µg', v2: 'premedicate' },
  { t: 240, v1: 'Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg', v2: 'induce' },
  { t: 300, v1: 'Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %', v2: 'intubate' },
  { t: 360, v1: 'Start surgery: rocuronium 0.6 mg/kg', v2: 'startSurgery' },
  { t: 492, v1: 'MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate', v2: 'callCrisis' }, // 08:12
  { t: 512, v1: 'Dantrolene 2.5 mg/kg', v2: 'dantrolene' }, // 08:32
  { t: 832, v1: 'EtCO₂ normal: ventilation back to 12 × 500', v2: 'ventilationBack' }, // 13:52
  { t: 1153, v1: 'Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)', v2: 'dantroleneAgain' }, // 19:13
];
/** The run of show's four pauses (after the first fast-forward, after span 1, after span 2, the end) and 08:45, the
 *  pause the owner would use on /2 for Early signs while it was held 60 s (08:43); with the 20-s hold of 1 November
 *  Early signs comes at 08:03 and reads at the run sheet's own 08:05 pause. */
const PAUSES = [485, 525, 825, 1145, 1464];
const END_S = 1464;
/** Run on to the hour, past the talk, so a late phase is still printed and the entries per hour are counted. */
const RUN_S = 3600;
const POLL_S = 0.4; // the app's poll at ×4
const V2 = process.env.MH_TABLE_V2 ?? 'showcase-mh-v2';
const CALL_AT_EARLY = process.env.MH_TABLE_CALL === 'earlySigns';
const EARLY_HOLD = process.env.MH_TABLE_EARLY_HOLD ? Number(process.env.MH_TABLE_EARLY_HOLD) : undefined;
/** The /2 card measured: the file, or its variant with Early signs' hold changed (in memory). */
function v2Doc(): ScenarioDocV2 {
  const d = structuredClone(anyShowcaseDoc(V2)) as ScenarioDocV2;
  if (EARLY_HOLD !== undefined) for (const p of d.phases) if (p.id === 'earlySigns') p.holdS = EARLY_HOLD;
  return d;
}

const mmss = (t: number | undefined) => (t === undefined ? 'never' : `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`);

/** The /1 card on the engine with its presses, its record wired as the app's (HostSession → hub → RunRecord). */
async function v1Run(untilS: number, times: readonly number[]): Promise<{ rec: RunRecord; states: Array<[number, string]>; pressed: number[] }> {
  const v = validateScenario(anyShowcaseDoc('showcase-mh'));
  if (!v.ok) throw new Error(v.errors.join('; '));
  const doc = v.doc as ScenarioDoc;
  const eo = engineOptionsOf(doc, 7);
  const engine = createEngine({ ...eo, mode: doc.mode ?? 'modeled', truthHz: 1, patient: { ...eo.patient, ...(doc.patient?.sensors ? { sensors: doc.patient.sensors } : {}) } } as never);
  const target: HostTarget = { dispatch: (c) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (f) => engine.on(f), now: () => engine.now(), time: () => {} };
  const states: Array<[number, string]> = [];
  let hs: HostSession | null = null;
  const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e) => (states.push([e.t, e.stateId]), hs?.publish(e)) });
  hs = new HostSession({ session: 'MHTBL1', target: driver.host, scenario: driver.hook, stateIntervalMs: 0 });
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const tap = hub.connect();
  const rec = new RunRecord(() => ({ patient: 'test', weightKg: doc.patient?.weightKg ?? 70 }));
  tap.onMessage((m) => m.kind === 'event' && m.body.forEach((e) => rec.wire(e)));
  engine.on((e) => rec.engine(e));
  const settle = () => new Promise((r) => setTimeout(r, 0));
  await hs.submit({ id: 'load', issuedBy: 'instructor', type: 'scenario', action: 'load', doc } as never);
  const pressed = PATH.map(() => Number.NaN);
  for (let n = 1; n <= Math.round(untilS / POLL_S); n++) {
    const t = Math.round(n * POLL_S * 1000) / 1000;
    engine.advanceTo(t);
    driver.poll();
    const i = pressed.findIndex((x, k) => Number.isNaN(x) && t >= (times[k] as number) - 1e-9);
    if (i >= 0 && (i === 0 || !Number.isNaN(pressed[i - 1] as number))) {
      const tr = driver.runner?.state().transitions?.find((x) => manualLabel(x.when) === (PATH[i] as { v1: string }).v1);
      if (tr) {
        await hs.submit({ id: `p${i}`, issuedBy: 'instructor', type: 'scenario', action: 'trigger', target: tr.id } as never);
        driver.poll();
        pressed[i] = t;
      }
    }
    await settle();
  }
  hs.close();
  return { rec, states, pressed };
}

it(`the MH table: /1 (showcase-mh) against /2 (${V2}) on the demo path, printed`, async () => {
  // the /2 run first: with MH_TABLE_CALL=earlySigns its call is pressed at the first Early signs reading, and the /1
  // card is then pressed at the /2 run's press times, so both cards drive the same patient
  const early = (s: { state: string }) => s.state === 'earlySigns';
  const acts2: Act[] = PATH.map((p) => (CALL_AT_EARLY && p.v2 === 'callCrisis' ? { press: p.v2, action: p.v2, when: early }
    : CALL_AT_EARLY && p.v2 === 'dantrolene' ? { press: p.v2, action: p.v2, when: early, delayS: 20 }
    : { press: p.v2, action: p.v2, t: p.t }));
  const etco2T: Array<[number, number]> = []; // the truth the precondition reads (the state event's values)
  const v2doc = v2Doc();
  const b = await runCard(V2, acts2, RUN_S, (e) => {
    const v = (e as { type: string; values?: Record<string, unknown> }).values?.etco2;
    if (e.type === 'state' && typeof v === 'number') etco2T.push([e.t, v]);
  }, POLL_S, v2doc);
  expect(b.pressed.every((x) => !Number.isNaN(x)), `/2 presses ${b.pressed.join(' ')}`).toBe(true);
  const a = await v1Run(RUN_S, b.pressed);
  expect(a.pressed.every((x) => !Number.isNaN(x)), `/1 presses ${a.pressed.join(' ')}`).toBe(true);
  expect(b.pressed).toEqual(a.pressed);
  expect(b.refused).toEqual([]);
  // the same patient (the harness's /1 run against the /2 run, every second; malignant-hyperthermia-v2 asserts it too)
  const a1 = await runCard('showcase-mh', PATH.map((p, i) => ({ press: p.v1, t: b.pressed[i] as number })), RUN_S, undefined, POLL_S);
  expect(b.rows.map(({ state: _s, ...x }) => x)).toEqual(a1.rows.map(({ state: _s, ...x }) => x));

  const v1doc = anyShowcaseDoc('showcase-mh') as ScenarioDoc;
  const label1 = (id: string) => v1doc.states.find((s) => s.id === id)?.label ?? id;
  const label2 = (id: string) => v2doc.phases.find((p) => p.id === id)?.label ?? id;
  const nth = (xs: Array<[number, string]>, id: string, n = 1) => xs.filter(([, s]) => s === id)[n - 1]?.[0];
  const at = (xs: Array<[number, string]>, t: number) => xs.filter(([s]) => s <= t + 1e-9).at(-1)?.[1] ?? '';
  const S1 = a1.states; // the harness's /1 run: the same driver loop as the /2 run (the host-wired run is for the Debrief)
  const S2 = b.states;
  const L: string[] = [`MH table: /1 showcase-mh vs /2 ${V2}${EARLY_HOLD !== undefined ? ` (VARIANT: Early signs hold ${EARLY_HOLD} s)` : ''}; presses ${b.pressed.map((t) => mmss(t)).join(', ')}${CALL_AT_EARLY ? ' (the call at the first Early signs reading, dantrolene 20 s later)' : ' (the run sheet)'}; poll ${POLL_S} s`];
  L.push('', '1. Phase entries (/1 state | /2 phase)');
  const rows: Array<[string, number | undefined, string, number | undefined]> = [
    ['Latent', nth(S1, 'surgery'), '(/1: surgery, by its press)', nth(S2, 'latent')],
    ['Early signs', nth(S1, 'earlySigns'), '', nth(S2, 'earlySigns')],
    ['Treated', nth(S1, 'treating'), '(/1: treating)', nth(S2, 'treated')],
    ['Recovering', nth(S1, 'recovering'), '', nth(S2, 'recovering')],
    ['Recrudescence', nth(S1, 'normoventilated'), '(/1: normoventilated, by its press)', nth(S2, 'recrudescence')],
    ['2nd Treated', nth(S1, 'treating', 2), '(/1: treating again)', nth(S2, 'treated', 2)],
    ['2nd Recovering', nth(S1, 'recovering', 2), '', nth(S2, 'recovering', 2)],
  ];
  for (const [name, t1, note, t2] of rows) L.push(`  ${name.padEnd(15)} /1 ${mmss(t1).padEnd(8)} /2 ${mmss(t2).padEnd(8)} ${note}`);
  L.push(`  /1 all: ${S1.map(([t, s]) => `${s} ${mmss(t)}`).join(', ')}`);
  L.push(`  /1 host-wired run (its Debrief below): ${a.states.map(([t, s]) => `${s} ${mmss(t)}`).join(', ')}`);
  L.push(`  /2 all: ${S2.map(([t, s]) => `${s} ${mmss(t)}`).join(', ')}`);
  const short = S2.slice(1).map(([t, s], i) => [s, t - (S2[i] as [number, string])[0], S2[i]?.[1]] as const).filter(([, d]) => d < 60 - 1e-6);
  L.push(`  /2 phases held < 60 s: ${short.length ? short.map(([s, d, prev]) => `${prev} for ${d.toFixed(1)} s before ${s}`).join('; ') : 'none'}; entries ${S2.length} in ${RUN_S / 60} min`);
  L.push('', '2. The strip at the four pauses and 08:45 (/1 | /2)');
  for (const t of PAUSES) L.push(`  ${mmss(t).slice(0, 5)}  /1 ${label1(at(S1, t))}  |  /2 ${label2(at(S2, t))}`);
  L.push('', `3. Debrief at ${mmss(END_S).slice(0, 5)} (/1 objectives(); /2 grade(), final)`);
  const end1 = a.rec.data;
  const cut = { ...end1, rows: end1.rows.filter((r) => r.t <= END_S + 1e-9), samples: end1.samples.filter((s) => s.t <= END_S + 1e-9) };
  objectives(cut).forEach((o, i) => L.push(`  /1 ${i + 1} ${o.verdict.status.padEnd(15)} ${o.text.slice(0, 70)} — ${o.verdict.why.slice(0, 140)}`));
  const v2 = b.v2!;
  const phases = v2.phases.filter((p) => p.t <= END_S + 1e-9).map((p) => (p.exitT !== undefined && p.exitT > END_S ? { ...p, exitT: undefined } : p));
  const g = grade(v2doc, phases, v2.admin.filter((x) => x.t <= END_S + 1e-9), v2.edges.filter((x) => x.t <= END_S + 1e-9), END_S, { final: true });
  for (const x of g.actions) {
    const reps = x.repeats.map((r) => ` [repeat ${r.n}: ${r.grade}, due ${mmss(r.dueT)}, given ${mmss(r.t)}]`).join('');
    L.push(`  /2 ${x.id.padEnd(17)} ${x.grade.padEnd(15)} due ${mmss(x.dueT)}${x.windowS !== undefined ? ` +${x.windowS} s` : ''}, given ${mmss(x.givenT)}${reps}${x.lines.length ? ` | ${x.lines.join('; ')}` : ''}`);
  }
  L.push(`  /2 violations: ${g.violations.length}`);
  // 4. the hyperventilation: from the call to ventilation back, the EtCO₂ minimum and the longest run under 40 (truth,
  // which the precondition reads; and the monitor's number), and the precondition's edges
  const [callT, backT] = [b.pressed[PATH.findIndex((p) => p.v2 === 'callCrisis')] as number, b.pressed[PATH.findIndex((p) => p.v2 === 'ventilationBack')] as number];
  const under = (xs: Array<[number, number]>) => {
    let best = 0, from = Number.NaN, bestFrom = Number.NaN, min = Infinity, minT = Number.NaN;
    for (const [t, v] of xs) {
      if (t < callT || t > backT) continue;
      if (v < min) [min, minT] = [v, t];
      if (v < 40) {
        if (Number.isNaN(from)) from = t;
        if (t - from + 1 > best) [best, bestFrom] = [t - from + 1, from];
      } else from = Number.NaN;
    }
    return `min ${min.toFixed(1)} at ${mmss(minT)}; longest under 40: ${best.toFixed(0)} s${best ? ` from ${mmss(bestFrom)}` : ''}`;
  };
  L.push('', `4. The hyperventilation, call ${mmss(callT)} to ventilation back ${mmss(backT)}`);
  L.push(`  EtCO₂ truth (the precondition's): ${under(etco2T)}`);
  L.push(`  EtCO₂ monitor (1 Hz number):      ${under(b.rows.filter((r) => r.etco2 !== null).map((r) => [r.t, r.etco2 as number]))}`);
  L.push(`  ventilationBack precondition (EtCO₂ < 40 for 120 s) edges: ${v2.edges.filter((e) => e.rule === 'action:ventilationBack:precondition' && e.t <= END_S + 1e-9).map((e) => `${e.value ? 'true' : 'false'} ${mmss(e.t)}`).join(', ') || 'none'}`);
  console.log(L.join('\n'));
}, 900_000);
