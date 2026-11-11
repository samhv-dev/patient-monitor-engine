// @vitest-environment happy-dom
// Plan learner-action-remote.md L7 ("Tests first", dom): the tray's states from scripted `prep` events (the host's
// LearnerPrepNews), the host's concentration over the phone's preview, the countdown on the case clock and "no source"
// (LQ7), Give and "Deliver the tray" as the wire's `prep deliver` (one stage group, one batch), and a refusal in the
// host's own words ("given 4 s ago from the laptop", "not ready yet (0:42)"). The notice (LQ3): sounded once, the finding
// with its source shown inside the preparation, nothing before it. A `timeline` event clears the tray; another remote's
// news is not this tray's.
import { createStamper, type Formulary, type LearnerPrepNews, type LearnerPrepView, type WireBody, type WireMessage } from '@pme/controller';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadShippedFormulary } from '../formulary.ts';
import type { FollowerCommand } from '../views/follower.ts';
import type { BenchChoice } from './bench.ts';
import { trayView, TRAY_WORDS, FINDING_WORDS } from './tray.ts';

let f: Formulary;
beforeAll(async () => void (f = (await loadShippedFormulary()) as Formulary));

const ME = 'view-phone01';
const DANTROLENE: BenchChoice = { components: [{ productId: 'agilus-120mg', amount: 1, unit: 'vial' }], diluent: { id: 'water', volumeMl: 0 }, container: 'syringe-pp' };
const FENTANYL: BenchChoice = { components: [{ productId: 'fentanyl-50mcg-ml', amount: 2, unit: 'mL' }], container: 'syringe-pp' };
const MIX: BenchChoice = { components: [{ productId: 'sodium-bicarbonate-84mg-ml', amount: 10, unit: 'mL' }, { productId: 'adrenalin-1mg-ml', amount: 1, unit: 'mL' }], container: 'syringe-pp' };

function mount() {
  let now: number | null = 100;
  const sent: Array<FollowerCommand & { id: string }> = [];
  const fns = new Set<(m: WireMessage) => void>();
  const tone = vi.fn();
  let n = 0;
  const ids = ['dant0001', 'fent0002', 'mix00003', 'grp00004', 'more0005'];
  const t = trayView({ formulary: f, now: () => now, tone, newId: () => ids[n++] as string });
  document.body.replaceChildren(t.el);
  let c = 0;
  const off = t.attach({ command: (b) => (sent.push({ ...b, id: `cmd${++c}` }), `cmd${c}`), onMessage: (fn) => (fns.add(fn), () => void fns.delete(fn)), peerId: ME });
  const stamp = createStamper('GP3P4G', 'host-aaaaaa', () => Date.now());
  const from = (b: WireBody) => [...fns].forEach((fn) => fn(stamp(b)));
  const news = (news: LearnerPrepNews['news'], prep: LearnerPrepView, at = now ?? 0, to = ME) => from({ kind: 'event', body: [{ type: 'prep', t: at, to, body: { news, prep } satisfies LearnerPrepNews }] });
  const ack = (commandId: string, accepted: boolean, reason?: string) => from({ kind: 'ack', commandId, accepted, tick: 0, ...(reason ? { reason } : {}) });
  const item = (id: string) => t.el.querySelector<HTMLElement>(`.lr-item[data-prep="${id}"]`) as HTMLElement;
  const text = (id: string, s: string) => item(id)?.querySelector(s)?.textContent ?? null;
  return { t, sent, tone, off, news, ack, from, item, text, setNow: (x: number | null) => void (now = x), redraw: () => from({ kind: 'event', body: [] }) };
}

/** The host's view of dantrolene 120 mg in 20 mL water, ready 50 s after staging at t = 100 (as preparations.ts learnerView). */
const made = (id = 'dant0001', o: Partial<LearnerPrepView> = {}): LearnerPrepView => ({
  id, actives: [{ drugId: 'dantrolene', amount: 120, unit: 'mg', perMl: 6, rows: [] }], volumeMl: 20, leftMl: 20,
  diluent: { id: 'water', volumeMl: 0 }, container: 'syringe-pp', ready: { atS: 150, gap: null }, ...o,
});

describe('the tray (L7)', () => {
  beforeEach(() => vi.useRealTimers());

  it('"Put on the tray" sends `prep stage` with the choice and a device id; the phone\'s preview is labelled so until the host answers', () => {
    const m = mount();
    expect(m.t.el.querySelector('.lr-tray-empty')?.textContent).toBe(TRAY_WORDS.empty);
    m.t.stage(DANTROLENE);
    expect(m.sent).toEqual([{ id: 'cmd1', type: 'prep', action: 'stage', prep: { id: 'dant0001', components: DANTROLENE.components, diluent: { id: 'water', volumeMl: 0 }, container: 'syringe-pp' } }]);
    expect(m.t.ids).toEqual(['dant0001']);
    expect(m.text('dant0001', '.lr-item-title')).toBe('Dantrolene · Syringe (polypropylene)');
    expect(m.text('dant0001', '.lr-conc')).toBe('Dantrolene 5.31 mg/mL · 22.6 mL'); // the phone's preview: the label's 22.6 mL (N73)
    expect(m.item('dant0001').querySelector<HTMLElement>('.lr-conc')?.dataset.from).toBe('preview');
    expect(m.text('dant0001', '.lr-conc-source')).toBe(TRAY_WORDS.preview);
    expect(m.text('dant0001', '.lr-said')).toBe(TRAY_WORDS.sending);
    expect(m.item('dant0001').querySelector<HTMLElement>('.lr-give')?.hidden).toBe(true); // nothing to give until the host made it
  });

  it("the host's `made`: ITS concentration, the countdown on the case clock, then ready; a time with no source is ready at once and says so", () => {
    const m = mount();
    m.t.stage(DANTROLENE);
    m.ack('cmd1', true);
    m.news('made', made('dant0001', { actives: [{ drugId: 'dantrolene', amount: 120, unit: 'mg', perMl: 5.9, rows: [] }] })); // the host's figure wins
    expect(m.text('dant0001', '.lr-conc')).toBe('Dantrolene 5.9 mg/mL · 20 mL');
    expect(m.item('dant0001').querySelector<HTMLElement>('.lr-conc')?.dataset.from).toBe('host');
    expect(m.text('dant0001', '.lr-conc-source')).toBe(TRAY_WORDS.host);
    expect(m.text('dant0001', '.lr-state')).toBe('Preparing · ready in 0:50');
    m.setNow(107.5);
    m.redraw();
    expect(m.text('dant0001', '.lr-state')).toBe(TRAY_WORDS.preparing(42.5));
    expect(m.text('dant0001', '.lr-state')).toBe('Preparing · ready in 0:43');
    m.setNow(150);
    m.redraw();
    expect(m.text('dant0001', '.lr-state')).toBe('Ready · 20 mL left');
    m.t.stage(FENTANYL);
    m.news('made', { ...made('fent0002'), actives: [{ drugId: 'fentanyl', amount: 100, unit: 'mcg', perMl: 50, rows: [] }], volumeMl: 2, leftMl: 2, diluent: null, ready: { atS: 150, gap: 'LQ7' } });
    expect(m.text('fent0002', '.lr-state')).toBe(TRAY_WORDS.readyNoSource);
    expect(m.text('fent0002', '.lr-state')).toBe('Ready · preparation time: no source');
    expect(m.text('fent0002', '.lr-conc')).toBe('Fentanyl 50 µg/mL · 2 mL');
  });

  it("Give sends `prep deliver`; a refusal shows the host's words as they are", () => {
    const m = mount();
    m.t.stage(DANTROLENE);
    m.news('made', made());
    const it = m.item('dant0001');
    it.querySelector<HTMLButtonElement>('.lr-give-btn')!.click(); // before it is ready: the host refuses, in its words
    expect(m.sent[1]).toEqual({ id: 'cmd2', type: 'prep', action: 'deliver', prepId: 'dant0001', volumeMl: 'all', route: 'iv' });
    m.ack('cmd2', false, 'not ready yet (0:42)');
    expect(m.text('dant0001', '.lr-said')).toBe('Not given: not ready yet (0:42)');
    m.setNow(160);
    // a part, IO, over 30 s
    it.querySelector<HTMLButtonElement>('.seg button[data-v="part"]')!.click();
    const [ml, over] = [...it.querySelectorAll<HTMLInputElement>('.stepper input')];
    ml!.value = '5';
    ml!.dispatchEvent(new Event('change'));
    over!.value = '30';
    over!.dispatchEvent(new Event('change'));
    const route = it.querySelector<HTMLSelectElement>('.lr-give select')!;
    expect([...route.options].map((o) => o.textContent)).toEqual(['IV', 'IO', 'IM', 'SC']);
    route.value = 'io';
    it.querySelector<HTMLButtonElement>('.lr-give-btn')!.click();
    expect(m.sent[2]).toEqual({ id: 'cmd3', type: 'prep', action: 'deliver', prepId: 'dant0001', volumeMl: 5, route: 'io', overS: 30 });
    m.ack('cmd3', false, 'given 4 s ago from the laptop'); // the drug lock (drug-lock.ts lockReason), the host's words
    expect(m.text('dant0001', '.lr-said')).toBe('Not given: given 4 s ago from the laptop');
    // given: the host's `delivered` with what is left
    it.querySelector<HTMLButtonElement>('.lr-give-btn')!.click();
    m.ack('cmd4', true);
    m.news('delivered', made('dant0001', { leftMl: 15 }), 161);
    expect(m.text('dant0001', '.lr-said')).toBe('Given 5 mL at 02:41');
    expect(m.text('dant0001', '.lr-state')).toBe('Ready · 15 mL left');
    m.news('delivered', made('dant0001', { leftMl: 0 }), 170);
    expect(m.text('dant0001', '.lr-state')).toBe(TRAY_WORDS.emptied);
    expect(it.querySelector<HTMLButtonElement>('.lr-give-btn')!.disabled).toBe(true);
  });

  it('a stage the host refuses says "Not made" in its words; Remove takes it off the tray; "Discard" asks the host, whose `discarded` removes it', () => {
    const m = mount();
    m.t.stage(DANTROLENE);
    m.ack('cmd1', false, 'this computer has no formulary loaded yet');
    expect(m.text('dant0001', '.lr-said')).toBe('Not made: this computer has no formulary loaded yet');
    expect(m.text('dant0001', '.lr-discard')).toBe(TRAY_WORDS.remove);
    m.item('dant0001').querySelector<HTMLButtonElement>('.lr-discard')!.click();
    expect(m.t.ids).toEqual([]);
    expect(m.sent).toHaveLength(1); // nothing on the host to discard
    m.t.stage(FENTANYL);
    m.news('made', { ...made('fent0002'), leftMl: 2 });
    m.item('fent0002').querySelector<HTMLButtonElement>('.lr-discard')!.click();
    expect(m.sent.at(-1)).toEqual({ id: 'cmd3', type: 'prep', action: 'discard', prepId: 'fent0002' });
    m.news('discarded', made('fent0002'));
    expect(m.t.ids).toEqual([]);
  });

  it('"Deliver the tray" gives every ready one-drug syringe in one stage group, one batch; a two-drug syringe is given on its own', () => {
    const m = mount();
    m.t.stage(DANTROLENE);
    m.t.stage(FENTANYL);
    m.t.stage(MIX);
    const btn = m.t.el.querySelector<HTMLButtonElement>('.lr-deliver')!;
    expect(btn.textContent).toBe(TRAY_WORDS.deliver);
    expect(btn.disabled).toBe(true); // nothing made yet
    m.news('made', made('dant0001'));
    m.news('made', { ...made('fent0002'), actives: [{ drugId: 'fentanyl', amount: 100, unit: 'mcg', perMl: 50, rows: [] }], ready: { atS: 100, gap: 'LQ7' } });
    m.news('made', { ...made('mix00003'), actives: [{ drugId: 'sodiumBicarbonate', amount: 10, unit: 'mmol', perMl: 10 / 11, rows: [] }, { drugId: 'epinephrine', amount: 1, unit: 'mg', perMl: 1 / 11, rows: [] }], ready: { atS: 100, gap: 'LQ7' } });
    expect(btn.disabled).toBe(false);
    m.setNow(150);
    m.sent.length = 0;
    btn.click();
    expect(m.sent).toEqual([
      { id: 'cmd4', type: 'prep', action: 'deliver', prepId: 'dant0001', volumeMl: 'all', route: 'iv', stageGroup: 'tray-grp00004', batch: { id: 'tray-grp00004', n: 2 } },
      { id: 'cmd5', type: 'prep', action: 'deliver', prepId: 'fent0002', volumeMl: 'all', route: 'iv', stageGroup: 'tray-grp00004', batch: { id: 'tray-grp00004', n: 2 } },
    ]);
    // a two-drug preparation's items are acked <id> and <id>.2 (L4): a refusal of either shows on that syringe
    m.item('mix00003').querySelector<HTMLButtonElement>('.lr-give-btn')!.click();
    m.ack('cmd6.2', false, "given 3 s ago from a learner's remote");
    expect(m.text('mix00003', '.lr-said')).toBe("Not given: given 3 s ago from a learner's remote");
  });

  it('the notice (LQ3): nothing before it; at the host\'s `notice`, one sound and the finding with its source inside the preparation', () => {
    const m = mount();
    m.t.stage(MIX);
    expect(m.t.ids).toEqual(['dant0001']); // the first id the device drew
    const view = { ...made('dant0001'), actives: [{ drugId: 'sodiumBicarbonate', amount: 10, unit: 'mmol', perMl: 10 / 11, rows: [] }, { drugId: 'epinephrine', amount: 1, unit: 'mg', perMl: 1 / 11, rows: [] }], ready: { atS: 100, gap: 'LQ7' as const } };
    m.news('made', view);
    expect(m.item('dant0001').querySelector<HTMLElement>('.lr-finding')!.hidden).toBe(true);
    expect(m.t.el.textContent).not.toMatch(/incompatib/i);
    expect(m.tone).not.toHaveBeenCalled();
    const entry = f.drugs.sodiumBicarbonate!.admixtures.find((x) => x.with === 'epinephrine')!;
    const finding = { kind: 'incompatible' as const, drugId: 'sodiumBicarbonate', against: 'admixture' as const, other: 'epinephrine', statement: entry.statement, src: entry.src };
    m.news('notice', { ...view, notice: { shownAt: 125, findings: [finding] } });
    expect(m.tone).toHaveBeenCalledOnce();
    expect(m.t.sounded).toBe(1);
    const box = m.item('dant0001').querySelector<HTMLElement>('.lr-finding')!;
    expect(box.hidden).toBe(false);
    expect(box.querySelector('.lr-finding-head')?.textContent).toBe(`${TRAY_WORDS.notice} · Raised at 02:05`);
    const src = f.sources[entry.src]!;
    expect(src.kind).toBe('stabilis');
    expect(box.querySelector('.lr-finding-row')?.textContent).toBe(`${FINDING_WORDS.incompatible}: Sodium bicarbonate 8.4 % with Epinephrine. ${entry.statement} (Stabilis ${(src as { id: string }).id})`);
    // a later news of the same preparation (a give) keeps the finding and does not sound again
    m.news('delivered', { ...view, leftMl: 0, notice: { shownAt: 125, findings: [finding] } });
    expect(m.tone).toHaveBeenCalledOnce();
  });

  it("another remote's `prep` news is not this tray's; a `timeline` event (a restart, a restore) clears the tray and says why", () => {
    const m = mount();
    m.t.stage(DANTROLENE);
    m.news('made', made('dant0001', { volumeMl: 99 }), 100, 'view-other1');
    expect(m.item('dant0001').querySelector<HTMLElement>('.lr-conc')?.dataset.from).toBe('preview');
    m.news('made', made());
    m.from({ kind: 'event', body: [{ type: 'timeline', t: 0, tick: 0, cause: 'restart' }] });
    expect(m.t.ids).toEqual([]);
    expect(m.t.el.querySelector('.lr-tray-cleared')?.textContent).toBe(TRAY_WORDS.cleared);
    m.off(); // detached: a later stage sends nothing
    m.t.stage(DANTROLENE);
    expect(m.sent).toHaveLength(1);
  });
});
