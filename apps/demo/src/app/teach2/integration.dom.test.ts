// @vitest-environment happy-dom
// IP9's wiring of the pieces' seams (rulings 2 and 4): the strip's past-stage return reads the host-side driver's stage
// marks (ScenarioDriver.stageMarks(), #170) in place of IP5's stub, and ACTION's automatic-row bar reads the driver's
// hold accessor (ScenarioDriver.vitalHolds(), #170) in place of IP6's duck-typed call; a follower has neither.
import { describe, expect, it } from 'vitest';
import { ScenarioView, type ScenarioDoc } from '@pme/controller';
import type { VitalHold } from '@pme/controller/scenario';
import type { Link } from '../link.ts';
import { emptyRun } from '../record.ts';
import { showcaseDoc } from '../showcase/harness.ts';
import { mount } from './action.ts';
import type { Teach2Ctx } from './ctx.ts';
import { stageMarks } from './strip.ts';

const MH = showcaseDoc('showcase-mh') as ScenarioDoc;
const TICK_S = 0.02;
const mark = (n: number, stateId: string, t: number) => ({ id: `stage-mark-${n}`, issuedBy: 'scenario', type: 'scenario', action: 'bookmark', target: `stage:${stateId}:${n}`, kind: 'stage', note: stateId, atTick: Math.round(t / TICK_S) });

describe('the strip reads the driver\'s stage marks (ruling 2; review L4)', () => {
  it('a past stage\'s mark is the latest one with its note (the driver keeps the current course\'s), however late it was placed; none on a follower', () => {
    // triggerOff marked 3 ticks after its entry; treating (entered by the 2-s dantrolene hop at 520) when treating began
    const marks = [mark(9, 'triggerOff', 496.06), mark(10, 'treating', 522.04)];
    const host = { host: { driver: { stageMarks: () => marks.map((m) => ({ ...m })) } } } as unknown as Link;
    expect(stageMarks.of(host, { stage: 'triggerOff', stateId: 'triggerOff', t: 496 })).toBe('stage:triggerOff:9');
    expect(stageMarks.of(host, { stage: 'treating', stateId: 'dantrolene', t: 520 })).toBe('stage:treating:10');
    // a fast-forward: the monitor answered the stage's onEnter only at the end of the skip, 120 s after the entry
    marks.push(mark(11, 'recovering', 700 + 120));
    expect(stageMarks.of(host, { stage: 'recovering', stateId: 'recovering', t: 700 })).toBe('stage:recovering:11');
    expect(stageMarks.of(host, { stage: 'surgery', stateId: 'surgery', t: 360 })).toBeNull(); // left before its mark
    expect(stageMarks.of({ host: null } as unknown as Link, { stage: 'triggerOff', stateId: 'triggerOff', t: 496 })).toBeNull();
  });
});

describe('the automatic-row bar reads the driver\'s holds (ruling 4)', () => {
  function rig(holds: VitalHold[] | null) {
    const sv = new ScenarioView();
    sv.doc = MH;
    sv.docVersion = 1;
    sv.stateId = 'surgery';
    sv.enteredT = 360;
    sv.history = [{ t: 0, stateId: 'awake' }, { t: 360, stateId: 'surgery', transitionId: 'surgery' }];
    const record = emptyRun('test', 80, 0);
    record.doc = MH;
    const link = {
      ctl: { scenario: sv, bookmarks: [], simT: 400, state: { values: { etco2: 46 } }, hostPaused: false },
      host: holds === null ? null : { driver: { vitalHolds: () => holds }, record: { data: record } },
      simT: 400, log: [], send: async () => ({ accepted: true, tick: 0, commandId: 'c', rttMs: 0 }), note: () => undefined,
    } as unknown as Link;
    const el = document.createElement('div');
    const slot = mount(el, { link, keys: { digit: () => undefined, letter: () => undefined, escape: () => () => undefined }, dock: {}, openSheet: () => undefined } as unknown as Teach2Ctx);
    slot.refresh();
    return (el.querySelector('.ip2-row[data-kind="auto"] .ip2-bar-fill') as HTMLElement).style.width;
  }
  const hold = (fraction: number): VitalHold => ({ transitionId: 'early', key: 'early', variable: 'etco2', op: '>', threshold: 45, value: 46, met: true, heldS: fraction * 20, forS: 20, fraction });
  it('host: past the threshold, 70 % plus the hold\'s share of the last 30 %; a follower\'s met rule is full', () => {
    expect(rig([hold(0)])).toBe('70%');
    expect(rig([hold(0.5)])).toBe('85%');
    expect(rig([hold(1)])).toBe('100%');
    expect(rig(null)).toBe('100%');
  });
});
