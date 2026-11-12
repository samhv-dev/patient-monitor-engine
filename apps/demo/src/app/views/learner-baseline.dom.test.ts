// @vitest-environment happy-dom
// Plan learner-action-remote.md L0: the app's baseline the learner remote is measured against. These PIN TODAY (main at
// 8344539d): the follower page had no learner-remote instrument (L6 added `#/remote/learner` and its picker card, and
// changed that pin below), and a
// /2 card's sample action pressed on the instructor's screen is recorded by the scenario `record` command alone, with no
// engine command (L5 lets a learner's real draw satisfy it). A piece that changes one on purpose changes the pin.
import { describe, expect, it } from 'vitest';
import type { Action } from '@pme/controller/scenario';
import { instrumentOf } from '../classroom.ts';
import type { Link } from '../link.ts';
import { pressAction } from '../teach2/press.ts';
import { PICKER_WORDS } from './join.ts';

// L6 changed this pin on purpose: the follower page has the learner remote at `#/remote/learner` (and only there), and
// the picker its card, third, after the patient monitor (learner-remote.dom.test.ts, join.dom.test.ts test the page)
describe('L0, changed by L6: the follower page has the learner remote at #/remote/learner', () => {
  it('`#/remote/learner` is the learner remote; `#/remote` alone is still a hash the page does not know (the learner monitor)', () => {
    expect(instrumentOf('#/remote/learner')).toBe('remote');
    expect(instrumentOf('#/remote')).toBe('learner');
  });
  it('the picker offers the remote card after the patient monitor: learner monitor, patient monitor, learner remote, infusion pumps (A1), ventilator, depth, IABP', () => {
    expect(PICKER_WORDS.cards.map((c) => c.show)).toEqual(['learner', 'monitor', 'remote', 'pump', 'vent', 'depth', 'iabp']);
  });
});

describe('L0: a /2 sample action is recorded by its taking only', () => {
  it('pressing a sample action with nothing to give sends one `scenario record` of its id, and no engine command', async () => {
    const sent: unknown[] = [];
    const link = {
      send: async (c: unknown) => (sent.push(c), { accepted: true, tick: 0, commandId: 'c', rttMs: 0 }),
      sendBatch: async (cs: unknown[]) => (sent.push(...cs), cs.map(() => ({ accepted: true, tick: 0, commandId: 'c', rttMs: 0 }))),
    } as unknown as Link;
    await pressAction(link, { id: 'gas', label: 'Arterial gas', kind: 'sample', phases: ['early'] } as Action);
    expect(sent).toEqual([{ type: 'scenario', action: 'record', target: 'gas' }]);
  });
});
