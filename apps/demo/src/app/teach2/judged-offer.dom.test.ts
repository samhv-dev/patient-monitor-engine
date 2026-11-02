// @vitest-environment happy-dom
// The owner's ruling of 1 November on the /1 cards: the judged recognition row ("Name malignant hyperthermia from the
// monitor … (press when met)") was in ACTION from Awake, before any sign existed ("visible from the beginning … makes no
// sense"). It is offered from the moment its Debrief recognition clock starts — the state debrief-moments.ts
// `signStates` names, the one `recognitionFrom` counts from — and stays until met; then it is in Finished. A card with no
// such state (bronchospasm, tamponade: their signs show from Load) offers it from the start, as before. The other
// judged rows (no `debrief: "recognition"`) are unchanged.
import { describe, expect, it } from 'vitest';
import { ScenarioView, type ScenarioDoc } from '@pme/controller';
import type { ClinicalLogEntry, Link } from '../link.ts';
import { showcaseDoc } from '../showcase/harness.ts';
import { drugWords } from '../glossary.ts';
import { signStates } from '../debrief-moments.ts';
import { mount } from './action.ts';
import type { Teach2Ctx } from './ctx.ts';

type H = { t: number; stateId: string; transitionId?: string };
const doc = (id: string) => showcaseDoc(id) as ScenarioDoc;
const recognitionText = (d: ScenarioDoc) => {
  const o = (d.objectives ?? []).find((x) => typeof x === 'object' && x.debrief === 'recognition');
  return drugWords(typeof o === 'object' ? o.text : '');
};

/** ACTION mounted on `d` with `history` (its last entry current) at `simT`, a follower (the rows read the history
 *  alone); the recognition row as read: open (its right label and key), or in Finished. */
function action(d: ScenarioDoc, history: H[], simT: number, log: ClinicalLogEntry[] = []) {
  const sv = new ScenarioView();
  sv.doc = d;
  sv.docVersion = 1;
  sv.stateId = (history.at(-1) as H).stateId;
  sv.enteredT = (history.at(-1) as H).t;
  sv.history = history;
  const link = {
    ctl: { scenario: sv, bookmarks: [], simT, state: null, hostPaused: false }, host: null, simT, log,
    send: async () => ({ accepted: true, tick: 0, commandId: 'c', rttMs: 0 }), note: () => undefined,
  } as unknown as Link;
  const el = document.createElement('div');
  mount(el, { link, keys: { digit: () => undefined, letter: () => undefined, escape: () => () => undefined }, dock: {}, openSheet: () => undefined } as unknown as Teach2Ctx).refresh();
  const want = recognitionText(d);
  const title = (x: Element) => x.querySelector('.ip2-row-title')?.textContent ?? '';
  const open = [...el.querySelectorAll('.ip2-rows:not(.ip2-finished-list) .ip2-row')].find((x) => title(x) === want);
  return {
    open: open ? { right: open.querySelector('.ip2-row-right')?.textContent, look: (open as HTMLElement).dataset.look } : null,
    finished: [...el.querySelectorAll('.ip2-finished-list .ip2-row')].some((x) => title(x) === want),
  };
}

const MH = doc('showcase-mh');
const TO_SURGERY: H[] = [
  { t: 0, stateId: 'awake' },
  { t: 10, stateId: 'premedicated', transitionId: 'premed-air' },
  { t: 20, stateId: 'induced', transitionId: 'induce' },
  { t: 30, stateId: 'intubated', transitionId: 'intubate' },
  { t: 40, stateId: 'surgery', transitionId: 'surgery' },
];
const EARLY: H[] = [...TO_SURGERY, { t: 483, stateId: 'earlySigns', transitionId: 'early' }];

describe('ACTION (/1): the judged recognition row is offered from its Debrief clock\'s start (the owner\'s ruling of 1 November)', () => {
  it('the MH card\'s clock state is Early signs, the one the Debrief counts from', () => {
    expect([...signStates(MH)]).toEqual(['earlySigns']);
  });

  it('MH: absent at Awake and through Surgery under way (not greyed: no row at all)', () => {
    expect(action(MH, TO_SURGERY.slice(0, 1), 5).open).toBeNull();
    expect(action(MH, TO_SURGERY, 470).open).toBeNull();
  });

  it('MH: present once Early signs is entered, "press when met"; still there after the crisis is called', () => {
    expect(action(MH, EARLY, 490).open).toMatchObject({ right: 'press when met' });
    expect(action(MH, [...EARLY, { t: 500, stateId: 'triggerOff', transitionId: 'crisis-earlySigns' }], 510).open).toMatchObject({ right: 'press when met' });
  });

  it('MH: a return to a bookmark before Early signs takes the row away again (the kept course), until Early signs comes back', () => {
    expect(action(MH, [...EARLY, { t: 300, stateId: 'surgery' }], 320).open).toBeNull();
    expect(action(MH, [...EARLY, { t: 300, stateId: 'surgery' }, { t: 520, stateId: 'earlySigns', transitionId: 'early' }], 530).open).toMatchObject({ right: 'press when met' });
  });

  it('MH: after the tick it is in Finished, not open', () => {
    const r = action(MH, EARLY, 500, [{ kind: 'marker', text: `Objective met: ${recognitionText(MH)}`, simT: 492 }]);
    expect(r.open).toBeNull();
    expect(r.finished).toBe(true);
  });

  it('anaphylaxis: the same rule through the same code — absent while stable, offered from the reaction', () => {
    const A = doc('showcase-anaphylaxis');
    expect([...signStates(A)]).toEqual(['anaphylaxis']);
    expect(action(A, [{ t: 0, stateId: 'stable' }], 30).open).toBeNull();
    expect(action(A, [{ t: 0, stateId: 'stable' }, { t: 60, stateId: 'anaphylaxis' }], 70).open).toMatchObject({ right: 'press when met' });
  });

  it('bronchospasm and tamponade: no clock state (their signs show from Load), so the row is offered from the start, as before', () => {
    for (const [id, first] of [['showcase-bronchospasm', 'spasm'], ['showcase-tamponade', 'arrival']] as const) {
      const d = doc(id);
      expect(signStates(d).size).toBe(0);
      expect(action(d, [{ t: 0, stateId: first }], 1).open).toMatchObject({ right: 'press when met' });
    }
  });
});
