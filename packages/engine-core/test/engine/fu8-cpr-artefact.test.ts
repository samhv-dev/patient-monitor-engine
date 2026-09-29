// FU-8 Task A23 (research/20 DV-23a; gap V7): one clinical act, one command — the compressions put their artefact on
// the ECG. Before FU-8 (origin/main 3feee6f) the `cpr` event drove the circulation, pleth, NIBP and capnogram but not
// the ECG: the artefact was a separate modifier (`artefact.cpr`) nothing coupled to the event.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

type St = { mods: { artefact: { cpr: { rateCpm: number; depth: number } | null } } };

describe('FU-8 A23: the compressions put their artefact on the ECG', () => {
  it('CPR on → artefact.cpr at the compression rate, depth = quality; CPR off → cleared (research/20 DV-23a: one act, one command)', () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } as never });
    let n = 0;
    const send = (body: Record<string, unknown>) => e.dispatch({ id: `a${++n}`, issuedBy: 'test', ...body } as never);
    const st = () => (e as unknown as { st: St }).st;
    e.advanceTo(60);
    send({ type: 'setRhythm', rhythm: 'vfCoarse' });
    e.advanceTo(90);
    expect(st().mods.artefact.cpr).toBeNull();
    send({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 } });
    e.advanceTo(95);
    expect(st().mods.artefact.cpr).toEqual({ rateCpm: 110, depth: 0.8 });
    send({ type: 'applyEvent', event: { kind: 'cpr', active: false } });
    e.advanceTo(100);
    expect(st().mods.artefact.cpr).toBeNull();
  }, 60_000);
});
