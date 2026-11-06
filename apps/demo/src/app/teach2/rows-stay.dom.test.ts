// @vitest-environment happy-dom
// The dropped press (roadmap, "Classroom defects"): Instructor v2's ACTION kept each row's button across repaints but,
// whenever the order changed, moved EVERY row into a new <li> (`into.replaceChildren(...want.map((p) => h('li', {}, p)))`),
// so a press whose down and up straddled that repaint lost its row (WebKit seen). Now each row keeps its own <li>, and
// only the rows whose place changed move. And the first Instructor view's "What happens next" buttons stay the same
// nodes across repaints (they were rebuilt on every one).
import { describe, expect, it } from 'vitest';
import { ScenarioView, type AckResult, type CommandInput, type ScenarioDoc } from '@pme/controller';
import type { ClinicalLogEntry, Link } from '../link.ts';
import type { PanelCtx } from '../panel/ctx.ts';
import { scenarioTab } from '../panel/scenario.ts';
import { showcaseDoc } from '../showcase/harness.ts';
import { keepOrder } from '../ui.ts';
import { mount } from './action.ts';
import type { Teach2Ctx } from './ctx.ts';

const MH = showcaseDoc('showcase-mh') as ScenarioDoc;
const OK: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 };

function rig(doc: ScenarioDoc, stateId: string) {
  const sv = new ScenarioView();
  sv.doc = doc;
  sv.docVersion = 1;
  sv.stateId = stateId;
  const log: ClinicalLogEntry[] = [];
  const send = async (_c: CommandInput) => OK;
  const link = {
    ctl: { scenario: sv, bookmarks: [], simT: 0, send, state: null, hostPaused: false },
    host: null, simT: 0, log,
    send: async (c: CommandInput) => send(c),
    note: (text: string, kind = 'note') => void log.push({ simT: 0, kind: kind as ClinicalLogEntry['kind'], text }),
  } as unknown as Link;
  let refreshToday = () => undefined as void;
  const pctx = { link, staging: {}, site: {}, weightKg: () => 70, onRefresh: (fn: () => void) => (refreshToday = fn), goTab: () => undefined } as unknown as PanelCtx;
  const today = scenarioTab(pctx);
  const keys = { digit: () => undefined, letter: () => undefined, escape: () => () => undefined };
  const v2el = document.createElement('div');
  const slot = mount(v2el, { link, keys, site: {}, weightKg: () => 70, dock: {}, openSheet: () => undefined } as unknown as Teach2Ctx);
  document.body.replaceChildren(today, v2el);
  refreshToday();
  slot.refresh();
  return { today, v2el, refreshToday, slot };
}
const rows = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.ip2-rows:not(.ip2-finished-list) .ip2-row')];

describe('the dropped press: nodes under a press stay across repaints', () => {
  it('ACTION: a row leaving the list (judged → Finished) moves no other row: same buttons, same <li>', () => {
    const r = rig(MH, 'earlySigns');
    const before = rows(r.v2el);
    const steps = before.filter((p) => p.dataset.kind === 'step');
    expect(steps.length).toBeGreaterThan(0);
    const lis = steps.map((p) => p.parentElement);
    (before.find((p) => p.dataset.kind === 'judged') as HTMLButtonElement).click(); // judged: it moves to Finished
    r.slot.refresh();
    const after = rows(r.v2el);
    expect(after.some((p) => p.dataset.kind === 'judged')).toBe(false);
    steps.forEach((p, i) => {
      expect(after).toContain(p);
      expect(p.parentElement, 'the same list item').toBe(lis[i]);
      expect(p.isConnected).toBe(true);
    });
  });

  it('the first Instructor view: "What happens next" buttons are the same nodes after a repaint', () => {
    const r = rig(MH, 'intubated');
    const b1 = [...r.today.querySelectorAll('ul.next button')];
    expect(b1.length).toBeGreaterThan(0);
    r.refreshToday();
    r.refreshToday();
    const b2 = [...r.today.querySelectorAll('ul.next button')];
    expect(b2).toEqual(b1);
    b2.forEach((b, i) => expect(b).toBe(b1[i]));
  });

  it('keepOrder moves only what changed place', () => {
    const ul = document.createElement('ul');
    const [a, b, c, d, e] = ['a', 'b', 'c', 'd', 'e'].map((t) => Object.assign(document.createElement('li'), { textContent: t }));
    ul.append(a as Element, b as Element, c as Element, d as Element);
    const moved: string[] = [];
    const ins = ul.insertBefore.bind(ul);
    ul.insertBefore = (<T extends Node>(n: T, ref: Node | null): T => (moved.push(n.textContent ?? ''), ins(n, ref))) as typeof ul.insertBefore;
    keepOrder(ul, [b, c, a, e, d] as Element[]); // a moves after c, e is new: b, c, d stay
    expect([...ul.children].map((x) => x.textContent)).toEqual(['b', 'c', 'a', 'e', 'd']);
    expect(moved.sort()).toEqual(['a', 'e']);
  });
});
