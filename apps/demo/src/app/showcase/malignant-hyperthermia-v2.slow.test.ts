// showcase-mh-v2 (plan F8; the owner's phase table of 31 October): the MH card in pme-scenario/2 driven on the demo
// path — the run sheet's presses at their sim times (docs/showcase/SHOWCASE-2-RUN-SHEET.md §3) — against the /1 card
// driven on the same path on the same commit (the F0 goldens are local-only, so the reference is re-derived here).
// Asserted: the card validates; no command refused; the engine's course is the /1 card's to the second (the /2 presses
// send the /1 states' onEnter commands, and the condition goes with Induce in its stage group), so any difference in the
// phase times below is the owner's phase rules and their 60-s holds, never a different patient; the phases do not
// flap. PRINTED, not asserted: every phase entry against the /1 state entries (PME_SHOWCASE_PRINT=1 or always below).
import { describe, expect, it } from 'vitest';
import { validateScenario } from '@pme/controller/scenario';
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
/** The talk ends at 24:31; the run goes on to the hour so the later phases (recovering, recrudescence) are printed. */
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
    // the 60-s hold: no phase lasts less than 60 s except by a later rule's own 60-s hold (no flapping)
    for (let i = 1; i < b.states.length; i++) expect(b.states[i]![0] - b.states[i - 1]![0], `${ids[i - 1]} → ${ids[i]}`).toBeGreaterThanOrEqual(60 - 1e-6);
    expect(b.states.length).toBeLessThan(20);
  }, SLOW);
});
