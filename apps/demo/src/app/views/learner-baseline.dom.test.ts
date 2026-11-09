// @vitest-environment happy-dom
// Plan learner-action-remote.md L0: the app's baseline the learner remote is measured against. These PIN TODAY (main at
// 8344539d): the follower page has no learner-remote instrument (L6 adds `#/remote/learner` and its picker card), and a
// /2 card's sample action pressed on the instructor's screen is recorded by the scenario `record` command alone, with no
// engine command (L5 lets a learner's real draw satisfy it). A piece that changes one on purpose changes the pin.
import { describe, expect, it } from 'vitest';
import type { Action } from '@pme/controller/scenario';
import { instrumentOf } from '../classroom.ts';
import type { Link } from '../link.ts';
import { pressAction } from '../teach2/press.ts';
import { PICKER_WORDS } from './join.ts';

describe('L0: the follower page has no learner remote today', () => {
  it('`#/remote/learner` is not an instrument: like any hash the page does not know, it shows the learner monitor', () => {
    expect(instrumentOf('#/remote/learner')).toBe('learner');
    expect(instrumentOf('#/remote')).toBe('learner');
  });
  it("the picker offers no remote card: its cards are the learner monitor, the patient monitor, the ventilator, depth and IABP", () => {
    expect(PICKER_WORDS.cards.map((c) => c.show)).toEqual(['learner', 'monitor', 'vent', 'depth', 'iabp']);
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
