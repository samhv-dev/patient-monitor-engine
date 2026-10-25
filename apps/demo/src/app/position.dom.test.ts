// @vitest-environment happy-dom
// fix-reload-keeps-case: the position a reload comes back to — kept in this tab's sessionStorage, read back only under the
// same session code, build and engine and within MAX_AGE_MS (anything else is dropped), and the Debrief's record going on
// from the restored moment with one row saying so.
import { engineKey } from '@pme/engine-core';
import type { WireEvent } from '@pme/controller';
import { beforeEach, describe, expect, it } from 'vitest';
import mh from './showcase/showcase-mh.json';
import { APP_BUILD, clearPosition, MAX_AGE_MS, readPosition, RELOAD_MARK, savePosition, type Position } from './position.ts';
import { RunRecord } from './record.ts';

const NOW = 1_800_000_000_000;
const position = (o: Partial<Position> = {}): Position => ({
  schema: 'pme-position/1', code: 'KKQB2N', build: APP_BUILD, engine: engineKey, savedAt: NOW - 1000, cardId: 'showcase-mh', title: 'Malignant hyperthermia',
  stateId: 'intubated', simT: 511.2, speed: 4, paused: false, learner: false,
  run: { snapshot: { schema: 'pme-snapshot/1', engineVersion: engineKey, seed: 7, tick: 25560, state: { any: 'json' } }, seed: 0, runner: { stateId: 'intubated' } as never },
  record: new RunRecord(() => ({ patient: 'M 35 y 80 kg', weightKg: 80 })).keep(),
  ...o,
});
const read = (code = 'KKQB2N', now = NOW) => readPosition({ code, now });

describe('the position a reload comes back to', () => {
  beforeEach(() => sessionStorage.clear());

  it('survives JSON in sessionStorage and reads back whole under the same session code', () => {
    const p = position();
    expect(savePosition(p)).toBe(true);
    expect(read()).toEqual(p);
    expect(read()).toEqual(p); // reading keeps it (a second reload comes back too)
    clearPosition();
    expect(read()).toBeNull();
  });

  it('is dropped under another session code, another build or engine, a day later, or unreadable', () => {
    const cases: Array<[string, () => void]> = [
      ['another session code', () => void savePosition(position())],
      ['another app build', () => void savePosition(position({ build: 'deadbeef 2026-10-23' }))],
      ['another engine', () => void savePosition(position({ engine: '1.0.0-rc.2+dev' }))],
      ['a snapshot of another engine', () => void savePosition(position({ run: { ...position().run, snapshot: { ...position().run.snapshot, engineVersion: 'old' } } }))],
      ['another day', () => void savePosition(position({ savedAt: NOW - MAX_AGE_MS - 1 }))],
      ['unreadable', () => sessionStorage.setItem('pme.position', '{not json')],
    ];
    for (const [what, put] of cases) {
      put();
      expect(read(what === 'another session code' ? 'ZZZZZZ' : 'KKQB2N'), what).toBeNull();
      expect(sessionStorage.getItem('pme.position'), `${what}: dropped`).toBeNull();
    }
  });

  it('a storage that refuses it keeps nothing (never an older position)', () => {
    savePosition(position({ simT: 100 }));
    const full = { setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: (k: string) => sessionStorage.removeItem(k), getItem: (k: string) => sessionStorage.getItem(k) } as unknown as Storage;
    expect(savePosition(position({ simT: 500 }), full)).toBe(false);
    expect(read()).toBeNull();
  });

  it('the Debrief record goes on from the restored moment: later rows and samples dropped, one row says so', () => {
    const a = new RunRecord(() => ({ patient: 'M 35 y 80 kg', weightKg: 80 }));
    a.wire({ type: 'commandApplied', commandId: 'l', tick: 0, resolved: { command: { id: 'l', issuedBy: 'instructor', type: 'scenario', action: 'load', doc: mh } } } as WireEvent);
    a.wire({ type: 'scenario', t: 305, stateId: 'intubated' } as WireEvent);
    a.engine({ type: 'measurement', t: 509, values: { hr: { value: 69, flag: 'ok' } } } as never);
    a.engine({ type: 'measurement', t: 512, values: { hr: { value: 70, flag: 'ok' } } } as never);
    const kept = JSON.parse(JSON.stringify(a.keep())) as ReturnType<RunRecord['keep']>;
    const b = new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 })); // the reloaded page's fresh record
    b.wire({ type: 'commandApplied', commandId: 'r', tick: 25550, resolved: { command: { id: 'r', issuedBy: 'instructor', type: 'scenario', action: 'restoreBookmark', target: RELOAD_MARK } } } as WireEvent);
    b.resume(kept, 511);
    b.wire({ type: 'scenario', t: 305, stateId: 'intubated' } as WireEvent); // the restore's re-publish of the state
    expect(b.data.doc?.id).toBe('showcase-mh');
    expect(b.data.patient).toBe('M 35 y 80 kg');
    expect(b.data.rows.map((r) => `${r.t} ${r.kind} ${r.text}`)).toEqual([
      '0 scenario Scenario loaded: Malignant hyperthermia',
      '305 scenario Scenario state: Intubated: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 % at 2 L/min',
      '511 restore Restored after a reload of the page',
    ]);
    expect(b.data.samples.map((s) => s.t)).toEqual([509]);
  });
});
