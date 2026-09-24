// The runner's replay log (brief §3.3): feeding the logged inputs and control calls to a fresh runner with the
// same seed reproduces every decision; another seed changes the probabilistic ones.
import { describe, expect, it } from 'vitest';
import { replayRunLog, runLog } from '../../src/scenario/replay.ts';
import { ScenarioRunner } from '../../src/scenario/runner.ts';
import { doc, drug, shock, vals } from './fixtures.ts';

const d = doc([
  { id: 'shock', to: 'b', when: { event: { kind: 'defib', action: 'shock' } }, probability: 0.3 },
  { id: 'hot', to: 'c', when: { all: [{ event: { kind: 'drug', drugId: 'epinephrine' } }, { vital: { var: 'hr', op: '>', value: 150, forS: 5 } }] } },
]);

function session(seed: number): ScenarioRunner {
  const r = new ScenarioRunner(d, { seed });
  r.start(0);
  for (let k = 1; k <= 8 && r.stateId === 'a'; k++) r.advance(k * 30, [shock()]);
  r.pause(250);
  r.advance(260, [vals({ hr: 160 })]);
  r.resume(270);
  r.advance(271, [drug('epinephrine')]);
  r.advance(290);
  return r;
}

describe('replay log', () => {
  it('replays to identical decisions (rolls and state entries)', () => {
    const r = session(5);
    const log = runLog(r);
    expect(log.entries.some((e) => e.op === 'roll')).toBe(true);
    const res = replayRunLog(d, log);
    expect(res).toMatchObject({ ok: true, firstDiff: -1 });
    expect(JSON.parse(JSON.stringify(log))).toEqual(log); // plain JSON, storable next to the command log
  });

  it('a goto, a trigger and a restore in the log replay too', () => {
    const r = new ScenarioRunner(d, { seed: 2 });
    r.start(0);
    r.advance(1);
    const saved = r.getState();
    r.goto(5, 'b');
    r.setState(saved);
    r.trigger(6, 'shock');
    r.advance(6);
    expect(replayRunLog(d, runLog(r)).ok).toBe(true);
  });

  it('the same log with another seed diverges at a roll', () => {
    const log = runLog(session(5));
    const results = [6, 7, 8, 9, 10].map((seed) => replayRunLog(d, { ...log, seed }));
    const bad = results.find((x) => !x.ok);
    expect(bad).toBeDefined();
    expect(bad!.firstDiff).toBeGreaterThanOrEqual(0);
  });

  it('refuses a log for another document', () => {
    expect(() => replayRunLog(d, { schema: 'pme-scenario-log/1', docId: 'other', seed: 1, entries: [] })).toThrow('log is for other, not test');
  });
});
