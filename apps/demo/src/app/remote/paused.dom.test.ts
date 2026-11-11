// @vitest-environment happy-dom
// Learner remote L14 (the owner's ruling on N117): while the case is paused the phone's drug-giving controls (the tray's
// Give and "Deliver the tray", the Infusions tab's Start, Change and Stop) cannot be used and say why, from the pause the
// phone already follows (the host's `time pause` / `resume`, as its "(paused)" mark reads it: follower-status.ts
// hostPause). Preparing stays open. A give the host refused because the pause began while it was on its way (the
// `paused` code) shows the host's reason in the tray, never "Given". After the resume the controls work again.
import { createStamper, PAUSED_REFUSAL, type Formulary, type LearnerPrepNews, type LearnerPrepView, type WireBody, type WireMessage } from '@pme/controller';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadShippedFormulary } from '../formulary.ts';
import type { FollowerCommand } from '../views/follower.ts';
import { infusionsView, INFUSION_WORDS } from './infusions.ts';
import { trayView, TRAY_WORDS } from './tray.ts';

let f: Formulary;
beforeAll(async () => void (f = (await loadShippedFormulary()) as Formulary));
const ME = 'view-phone01';

function wire() {
  const fns = new Set<(m: WireMessage) => void>();
  const sent: Array<FollowerCommand & { id: string }> = [];
  let c = 0;
  const stamp = createStamper('GP3P4G', 'host-aaaaaa', () => Date.now());
  const from = (b: WireBody) => [...fns].forEach((fn) => fn(stamp(b)));
  return {
    sent, from,
    link: { command: (b: FollowerCommand) => (sent.push({ ...b, id: `cmd${++c}` }), `cmd${c}`), onMessage: (fn: (m: WireMessage) => void) => (fns.add(fn), () => void fns.delete(fn)), peerId: ME },
    /** The host's live `time pause` / `resume`, as every follower receives it. */
    time: (action: 'pause' | 'resume') => from({ kind: 'event', body: [{ type: 'commandApplied', commandId: `t-${action}`, tick: 500, resolved: { command: { id: `t-${action}`, issuedBy: 'instructor', type: 'time', action } } }] as never }),
    news: (news: LearnerPrepNews['news'], prep: LearnerPrepView, t = 100) => from({ kind: 'event', body: [{ type: 'prep', t, to: ME, body: { news, prep } satisfies LearnerPrepNews }] }),
    ack: (commandId: string, accepted: boolean, reason?: string, code?: string) => from({ kind: 'ack', commandId, accepted, tick: 0, ...(reason ? { reason } : {}), ...(code ? { code } : {}) } as never),
  };
}
const fentanyl = (o: Partial<LearnerPrepView> = {}): LearnerPrepView => ({
  id: 'fent0001', actives: [{ drugId: 'fentanyl', amount: 100, unit: 'mcg', perMl: 50, rows: [] }], volumeMl: 2, leftMl: 2,
  diluent: null, container: 'syringe-pp', ready: { atS: 0, gap: 'LQ7' }, ...o,
});

describe('L14: the tray while the case is paused', () => {
  it('Give and "Deliver the tray" cannot be used and the tray says why; preparing stays open; after the resume they work', () => {
    const w = wire();
    const t = trayView({ formulary: f, now: () => 100, tone: vi.fn(), newId: () => 'fent0001' });
    document.body.replaceChildren(t.el);
    t.attach(w.link);
    t.stage({ components: [{ productId: 'fentanyl-50mcg-ml', amount: 2, unit: 'mL' }], container: 'syringe-pp' });
    w.news('made', fentanyl());
    const give = t.el.querySelector<HTMLButtonElement>('.lr-give-btn')!;
    const deliver = t.el.querySelector<HTMLButtonElement>('.lr-deliver')!;
    const note = () => t.el.querySelector<HTMLElement>('.lr-paused')!;
    expect([give.disabled, deliver.disabled, note().hidden]).toEqual([false, false, true]);
    w.time('pause');
    expect([give.disabled, deliver.disabled, note().hidden]).toEqual([true, true, false]);
    expect(note().textContent).toBe(TRAY_WORDS.paused);
    give.click();
    expect(w.sent.filter((s) => s.action === 'deliver')).toEqual([]); // nothing sent from a disabled Give
    t.stage({ components: [{ productId: 'fentanyl-50mcg-ml', amount: 2, unit: 'mL' }], container: 'syringe-pp' }); // preparing: still sent
    expect(w.sent.filter((s) => s.action === 'stage')).toHaveLength(2);
    w.time('resume');
    expect([give.disabled, deliver.disabled, note().hidden]).toEqual([false, false, true]);
    give.click();
    expect(w.sent.at(-1)).toMatchObject({ type: 'prep', action: 'deliver', prepId: 'fent0001' });
  });

  it('a Give the host refused because the pause began on its way: the host\'s reason, never "Given"', () => {
    const w = wire();
    const t = trayView({ formulary: f, now: () => 100, tone: vi.fn(), newId: () => 'fent0001' });
    document.body.replaceChildren(t.el);
    t.attach(w.link);
    t.stage({ components: [{ productId: 'fentanyl-50mcg-ml', amount: 2, unit: 'mL' }], container: 'syringe-pp' });
    w.news('made', fentanyl());
    t.el.querySelector<HTMLButtonElement>('.lr-give-btn')!.click(); // tapped while running
    w.time('pause'); // the pause reached the host first
    w.ack('cmd2', false, PAUSED_REFUSAL, 'paused');
    const said = t.el.querySelector('.lr-said')!.textContent;
    expect(said).toBe(`Not given: ${PAUSED_REFUSAL}`);
    expect(said).not.toMatch(/^Given/);
  });
});

describe('L14: the Infusions tab while the case is paused', () => {
  it('Start, Change and Stop cannot be used and the tab says why; after the resume they work', () => {
    const w = wire();
    const eng = new Set<(e: never) => void>();
    const v = infusionsView({ now: () => 100 });
    document.body.replaceChildren(v.el);
    v.attach({ ...w.link, onEngine: (fn) => (eng.add(fn as never), () => void eng.delete(fn as never)), snapshot: () => new Promise(() => undefined), device: 'mephone00001' });
    w.news('made', { ...fentanyl(), id: 'prop0001', actives: [{ drugId: 'propofol', amount: 200, unit: 'mg', perMl: 10, rows: [] }], volumeMl: 20, leftMl: 20 });
    for (const fn of eng) fn({ type: 'drugs', t: 100, drugs: [{ id: 'remifentanil', rate: 0.1, amountUnit: 'mcg', tci: null }] } as never);
    const btns = () => [...v.el.querySelectorAll<HTMLButtonElement>('.lr-start, .lr-change-btn, .lr-stop')];
    const note = () => v.el.querySelector<HTMLElement>('.lr-paused')!;
    expect(btns()).toHaveLength(3);
    expect(btns().map((b) => b.disabled)).toEqual([false, false, false]);
    w.time('pause');
    expect(btns().map((b) => b.disabled)).toEqual([true, true, true]);
    expect([note().hidden, note().textContent]).toEqual([false, INFUSION_WORDS.paused]);
    w.time('resume');
    expect(btns().map((b) => b.disabled)).toEqual([false, false, false]);
    expect(note().hidden).toBe(true);
  });
});
