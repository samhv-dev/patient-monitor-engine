// The twin run (docs/plans/scenario-builder.md §7.3, piece B7): for each port in ports.json, the /1 card and its /2 port
// run on the same patient and seed, the /2 port pressed at the /1 run's ABSOLUTE press times through its action ids, and
// the differences reported in §7.3's terms: the command stream the engine received (type, payload, applied tick), the
// 1 Hz trace, the phase-timing table, O4 (a script entry on a press fires in that press's stage group, on its tick), and
// the accepted beats. A statement of differences, not a claim of identity: a row's `result` is the words the run read in
// CI, and this test fails when the run no longer reads so.
// Both runs use the engine's own clock (harness.ts runCard: engine.advanceTo, the driver polled every 0.1 s of sim time,
// as the app at ×1) and stop at the row's `untilS` of sim time: nothing is run faster or waited longer to agree.
// The manifest has no port yet; the machinery is proved on a constructed pair made for this test: one card with no
// flagged beat (the twin run agrees) and its port with one number planted wrong (the twin run reports it).
import type { ScenarioDoc, ScenarioDocV2 } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { convertV1 } from '../builder/convert.ts';
import manifest from './ports.json';
import { portCheckWords, twinRun, type PortRow } from './twin.ts';

/** A small card with no flagged beat: two instructor presses, each moving the heart rate. */
const V1: ScenarioDoc = {
  schema: 'pme-scenario/1', id: 'twin-probe', title: 'Twin probe', seed: 11, mode: 'modeled',
  patient: { ageY: 40, sex: 'M', weightKg: 75, heightCm: 178, sensors: { ecg: 'on', spo2: 'on' } },
  initialState: 'rest',
  states: [
    { id: 'rest', label: 'Rest', onEnter: [{ type: 'setTarget', variable: 'hr', value: 72 }], transitions: [{ id: 'stir', to: 'stirred', when: { manual: { label: 'Stir' } } }] },
    { id: 'stirred', label: 'Stirred', onEnter: [{ type: 'setTarget', variable: 'hr', value: 110, ramp: { durationS: 20 } }], transitions: [{ id: 'calm', to: 'calmed', when: { manual: { label: 'Calm' } } }] },
    { id: 'calmed', label: 'Calmed', onEnter: [{ type: 'setTarget', variable: 'hr', value: 80, ramp: { durationS: 20 } }] },
  ],
};
const PRESSES = [{ t: 30, v1: 'Stir', v2: 'stir' }, { t: 90, v1: 'Calm', v2: 'calm' }];
const UNTIL_S = 150;

describe('the twin run’s machinery, on a constructed pair', () => {
  it('a card with no flagged beat and its converted port: the twin run agrees', async () => {
    const { draft, flags } = convertV1(V1);
    expect(flags).toEqual([]);
    const r = await twinRun(V1, draft, PRESSES, UNTIL_S);
    expect(r.pressed).toEqual({ v1: [30, 90], v2: [30, 90] });
    expect(r.commands.diffs).toEqual([]);
    expect(r.commands.count).toBeGreaterThan(0);
    expect(r.trace.differing).toBe(0);
    expect(r.trace.seconds).toBe(UNTIL_S);
    expect(r.o4.lines).toEqual([]);
    expect(r.stop).toBe(`stopped at ${UNTIL_S} s of sim time on the engine’s clock`);
    // the phase table: /2 has one phase (the presses' states are actions), entered with /1's initial state
    expect(r.phases).toEqual([{ id: 'rest', n: 1, v1: 0, v2: 0 }]);
    expect(portCheckWords(r, 0)).toBe('Port check: command stream identical; trace identical; 0 beats changed by design');
  }, 300_000);

  it('the same port with one number planted wrong: the twin run reports the command and the trace', async () => {
    const { draft } = convertV1(V1);
    const planted = structuredClone(draft) as ScenarioDocV2;
    const give = planted.actions.find((a) => a.id === 'calm')!.give!;
    (give[0] as { value: number }).value = 95; // /1 sends 80
    const r = await twinRun(V1, planted, PRESSES, UNTIL_S);
    expect(r.commands.diffs.length).toBe(1);
    expect(r.commands.diffs[0]).toContain('"value":80');
    expect(r.commands.diffs[0]).toContain('"value":95');
    expect(r.trace.differing).toBeGreaterThan(0);
    expect(r.trace.first!.t).toBeGreaterThan(90);
    expect(r.trace.first!.t).toBeLessThan(UNTIL_S);
    expect(r.trace.first!.keys).toContain('hr');
    expect(portCheckWords(r, 0)).toMatch(/^Port check: command stream differs \(1 of \d+ commands, first at tick \d+\); trace differs in \d+ of 150 s \(first at 01:\d\d: [^)]*hr[^)]*\); 0 beats changed by design$/);
  }, 300_000);
});

describe('the ports in ports.json', () => {
  const rows = (manifest as { ports: PortRow[] }).ports;
  it('the manifest is a list of rows (empty until the first port)', () => {
    expect(Array.isArray(rows)).toBe(true);
    for (const r of rows) expect(Object.keys(r).sort()).toEqual(['accepted', 'presses', 'result', 'untilS', 'v1', 'v2']);
  });
  for (const row of rows) {
    it(`${row.v2}: the twin run reads as its row says`, async () => {
      const docs = import.meta.glob<{ default: unknown }>('./**/*.json', { eager: true });
      const doc = (f: string) => docs[`./${f}`]?.default;
      const r = await twinRun(doc(row.v1) as ScenarioDoc, doc(row.v2) as ScenarioDocV2, row.presses, row.untilS);
      console.log(`${row.v2}: ${portCheckWords(r, row.accepted.length)}\n${r.lines.join('\n')}`);
      expect(portCheckWords(r, row.accepted.length)).toBe(row.result);
    }, 900_000);
  }
});
