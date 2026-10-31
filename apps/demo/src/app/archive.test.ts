// The Debrief archive (board "Finish 2", approved 30 October): every debrief "Finish the case" saves is kept in this
// browser (localStorage) until the instructor clears it: the debrief's JSON as the Debrief view builds it, beside the
// resident, the card, when it was saved, the run's duration and the objective counts. A second save of one run
// replaces its entry; a storage that refuses (full, blocked) saves nothing and says so; "Export all" is one JSON file.
import type { WireEvent } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { Archive, markCounts, marksLine, objectiveCounts, objectivesLine } from './archive.ts';
import { MemoryStorage as Mem } from './memory-storage.ts';
import { RunRecord } from './record.ts';
import induction from './showcase/showcase-induction.json';

const applied = (tick: number, command: Record<string, unknown>): WireEvent =>
  ({ type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, issuedBy: 'instructor', ...command } } }) as WireEvent;
const state = (t: number, stateId: string, transitionId?: string): WireEvent => ({ type: 'scenario', t, stateId, ...(transitionId ? { transitionId } : {}) }) as WireEvent;

/** A run of the induction card with four objectives (one met by its rule, one ticked, one not met, one not
 *  assessable), three marks (one with a note) and one instructor note, 01:40 long. */
function run(startedAt = Date.UTC(2026, 9, 30, 9, 0)) {
  const record = new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 }), () => startedAt);
  const doc = {
    ...induction,
    objectives: [
      { text: 'Induce', rule: { kind: 'occurred', event: 'state:induced' } },
      'Call for help',
      { text: 'Never desaturate', rule: { kind: 'never', event: 'state:induced' } },
      'Speak to the family',
    ],
  };
  record.wire(applied(0, { type: 'scenario', action: 'load', doc }));
  record.wire(state(0, 'awake'));
  record.wire(applied(500, { type: 'scenario', action: 'trigger', target: 'induce' }));
  record.wire(state(10, 'induced', 'induce'));
  record.wire(applied(1000, { type: 'scenario', action: 'bookmark', target: 'Mark 1 at 00:20', kind: 'good', note: 'calm' }));
  record.wire(applied(1500, { type: 'scenario', action: 'bookmark', target: 'Mark 2 at 00:30', kind: 'good' }));
  record.wire(applied(2000, { type: 'scenario', action: 'bookmark', target: 'Mark 3 at 00:40', kind: 'discuss' }));
  record.note(50, 'Objective met: Call for help');
  record.note(60, 'Asked for the difficult airway trolley');
  record.note(100, 'Handed over to recovery');
  return record;
}

describe('the counts the Finish pane and the archive show', () => {
  it('objectives: met (by its rule or ticked), not met, not assessable; marks by kind and the notes', () => {
    const d = run().data;
    const o = objectiveCounts(d);
    expect(o).toEqual({ met: 2, total: 4, notMet: 1, notAssessable: 1 });
    expect(objectivesLine(o)).toBe('2 of 4 met · 1 not met · 1 not assessable');
    const m = markCounts(d);
    // a note: the instructor's own lines (not an objective's tick) and a mark's note
    expect(m).toEqual({ good: 2, bad: 0, discuss: 1, notes: 3 });
    expect(marksLine(m)).toBe('2 good · 0 bad · 1 discuss · 3 notes');
  });

  it('a run without objectives or marks says so', () => {
    const d = new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 }), () => 1).data;
    expect(objectivesLine(objectiveCounts(d))).toBe('no objectives on this card');
    expect(marksLine(markCounts(d))).toBe('0 good · 0 bad · 0 discuss · 0 notes');
  });
});

describe('the archive store', () => {
  const at = Date.UTC(2026, 9, 30, 9, 25);

  it('saves the debrief JSON as the Debrief view builds it, beside the resident, card, time, duration and counts', () => {
    const mem = new Mem();
    const a = new Archive(() => mem);
    const d = run().data;
    const e = a.save(d, ' Dr Rahimi ', 'build-x', at);
    expect(e).not.toBeNull();
    expect(e).toMatchObject({ resident: 'Dr Rahimi', cardId: 'showcase-induction', title: 'Healthy induction', savedAt: at, runStartedAt: d.startedAt, durationS: 100, objectives: { met: 2, total: 4, notMet: 1, notAssessable: 1 } });
    expect(a.list()).toEqual([e]);
    const json = JSON.parse(a.debrief(e?.id as string) as string);
    expect(json.schema).toBe('pme-debrief/2');
    expect(json.build).toBe('build-x');
    expect(json.record.startedAt).toBe(d.startedAt);
    expect(json.objectives).toHaveLength(4);
    expect(json.marks).toHaveLength(3);
    // the index and each body are their own keys: the list never parses a debrief
    expect([...mem.m.keys()].sort()).toEqual(['pme.archive', `pme.archive.${e?.id}`]);
  });

  it('a second save of the same run replaces its entry (the resident as typed last); another run is a new entry', () => {
    const mem = new Mem();
    const a = new Archive(() => mem);
    const r = run();
    const one = a.save(r.data, 'Dr A', 'b', at);
    const again = a.save(r.data, 'Dr B', 'b', at + 60_000);
    expect(again?.id).toBe(one?.id);
    expect(a.list().map((x) => x.resident)).toEqual(['Dr B']);
    expect(a.forRun(r.data.startedAt)?.id).toBe(one?.id);
    const other = a.save(run(Date.UTC(2026, 9, 30, 10, 0)).data, 'Dr C', 'b', at + 120_000);
    expect(a.list().map((x) => x.resident)).toEqual(['Dr B', 'Dr C']);
    expect(a.forRun(Date.UTC(2026, 9, 30, 10, 0))?.id).toBe(other?.id);
    expect(a.forRun(12345)).toBeNull();
  });

  it('a storage that refuses saves nothing (null) and leaves the archive as it was', () => {
    const mem = new Mem(4000);
    const a = new Archive(() => mem);
    expect(a.save(run().data, 'Dr A', 'b', at)).toBeNull();
    expect(a.list()).toEqual([]);
    expect([...mem.m.keys()]).toEqual([]);
    const blocked = new Archive(() => null);
    expect(blocked.save(run().data, 'Dr A', 'b', at)).toBeNull();
    expect(blocked.list()).toEqual([]);
  });

  it('counts the debriefs saved today; one entry and all of them export as JSON; clear empties it', () => {
    const mem = new Mem();
    const a = new Archive(() => mem);
    const yesterday = a.save(run(Date.UTC(2026, 9, 29, 9, 0)).data, 'Dr Y', 'b', at - 86_400_000);
    const today = a.save(run().data, 'Dr T', 'b', at);
    expect(a.savedToday(at)).toBe(1);
    const one = JSON.parse(a.entryJson(today?.id as string) as string);
    expect(one).toMatchObject({ schema: 'pme-archive-entry/1', resident: 'Dr T', title: 'Healthy induction', savedAt: at });
    expect(one.debrief.schema).toBe('pme-debrief/2');
    const all = JSON.parse(a.bundleJson(at + 1));
    expect(all.schema).toBe('pme-archive/1');
    expect(all.exportedAt).toBe(at + 1);
    expect(all.entries.map((x: { resident: string }) => x.resident)).toEqual(['Dr Y', 'Dr T']);
    expect(all.entries[0].debrief.schema).toBe('pme-debrief/2');
    expect(a.entryJson(yesterday?.id as string)).not.toBeNull();
    const v = a.version;
    a.clear();
    expect(a.version).toBeGreaterThan(v);
    expect(a.list()).toEqual([]);
    expect([...mem.m.keys()]).toEqual([]);
    expect(a.entryJson(today?.id as string)).toBeNull();
  });

  it('an unreadable index reads as empty', () => {
    const mem = new Mem();
    mem.setItem('pme.archive', '{not json');
    expect(new Archive(() => mem).list()).toEqual([]);
  });
});
