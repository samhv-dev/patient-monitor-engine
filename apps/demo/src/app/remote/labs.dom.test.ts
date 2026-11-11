// @vitest-environment happy-dom
// Plan learner-action-remote.md L11 ("Tests first"): 1. the view never renders a `labs` event (the engine's 1 Hz truth):
// a test feeds both and checks; 2. the result appears at the tick its `labResult` arrives, never before; 3. a result of
// another device's or the instructor's sample is not shown (LQ13 ruled, B: a remote sees its own samples). And: Send is
// `applyEvent lab` with the panel only (§4 D2 item 5); the pending row's times are the engine's rows (analysers.ts
// turnaroundFor), never typed here; earlier results stay listed by draw time; a refusal is the host's words.
import { createStamper, type WireBody, type WireMessage } from '@pme/controller';
import { ANALYSERS, createEngine, LABORATORY, TICK_S, type Command, turnaroundFor, type EngineEvent, type LabPanel, type LabPanelId, type LabValues } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import type { FollowerCommand } from '../views/follower.ts';
import { LAB_SENDS, LABS_WORDS, labsView } from './labs.ts';

const ME = 'view-phone01';
const DEVICE = 'mephone00001';
const clock = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function mount() {
  const sent: Array<FollowerCommand & { id: string }> = [];
  const fns = new Set<(m: WireMessage) => void>();
  const eng = new Set<(e: EngineEvent) => void>();
  const v = labsView();
  document.body.replaceChildren(v.el);
  let c = 0;
  const off = v.attach({
    command: (b) => (sent.push({ ...b, id: `cmd${++c}` }), `cmd${c}`),
    onMessage: (fn) => (fns.add(fn), () => void fns.delete(fn)),
    onEngine: (fn) => (eng.add(fn), () => void eng.delete(fn)),
    peerId: ME, device: DEVICE,
  });
  const stamp = createStamper('GP3P4G', 'host-aaaaaa', () => Date.now());
  const from = (b: WireBody) => [...fns].forEach((fn) => fn(stamp(b)));
  const ack = (commandId: string, accepted: boolean, tick: number, reason?: string) => from({ kind: 'ack', commandId, accepted, tick, ...(reason ? { reason } : {}) });
  const applied = (tick: number, command: Record<string, unknown>) => from({ kind: 'event', body: [{ type: 'commandApplied', commandId: String(command.id), tick, resolved: { command } }] });
  const engine = (e: EngineEvent) => [...eng].forEach((fn) => fn(e));
  const result = (panel: LabPanelId, drawnAt: number, values: LabValues, analyser = panel === 'abg' || panel === 'vbg' ? 'abl825' : 'laboratory') =>
    engine({ type: 'labResult', t: drawnAt + turnaroundFor(panel), drawnAt, panel, analyser, values });
  /** Press Send for `panel`; the host acks it at `tick`. Returns the command. */
  const send = (panel: LabPanelId, tick: number) => {
    v.el.querySelector<HTMLButtonElement>(`.lr-lab-send[data-panel="${panel}"]`)!.click();
    const cmd = sent.at(-1)!;
    ack(cmd.id, true, tick);
    return cmd;
  };
  const rows = () => [...v.el.querySelectorAll<HTMLElement>('.lr-lab')];
  return { v, sent, off, ack, applied, engine, result, send, rows, from };
}

const ABG: LabValues = { ph: 7.21, pco2: 58, po2: 88, hco3: 22.4, be: -5.1, so2: 95.1, cohb: 0.8, methb: 0.6, lactate: 3.1, na: 139, k: 6.3, cl: 104, iCa: 1.12, hb: 11.4, glucose: 132, ag: 13, osm: 289 };
const TRUTH: LabPanel = { ph: 6.87, pco2: 91, po2: 44, hco3: 9.9, be: -19.9, so2: 61.3, cohb: 4.4, methb: 4.4, lactate: 14.4, na: 151, k: 7.7, cl: 88, iCa: 0.66, mg: 2.2, hb: 5.5, glucose: 444, ag: 33, osm: 333 };

describe('the Labs tab (L11)', () => {
  it('Send is `applyEvent lab` with the panel only, one button per panel the host takes', () => {
    const m = mount();
    expect(LAB_SENDS.map((s) => s.panel)).toEqual(['abg', 'vbg', 'chem', 'coag']);
    for (const s of LAB_SENDS) m.v.el.querySelector<HTMLButtonElement>(`.lr-lab-send[data-panel="${s.panel}"]`)!.click();
    expect(m.sent.map(({ id: _id, ...b }) => b)).toEqual(LAB_SENDS.map((s) => ({ type: 'applyEvent', event: { kind: 'lab', panel: s.panel } })));
    expect(m.v.el.querySelector('.lr-lab-said')?.textContent).toBe(LABS_WORDS.sending);
  });

  it('1. never renders a `labs` event: the 1 Hz truth changes nothing on the page, before and after a result', () => {
    const m = mount();
    const before = m.v.el.innerHTML;
    m.engine({ type: 'labs', t: 10, values: TRUTH });
    expect(m.v.el.innerHTML).toBe(before);
    m.send('abg', 1000); // drawn at 20 s
    m.result('abg', 1000 * TICK_S, ABG);
    const shown = m.v.el.innerHTML;
    for (let t = 0; t < 5; t++) m.engine({ type: 'labs', t: 120 + t, values: TRUTH });
    expect(m.v.el.innerHTML).toBe(shown);
    expect(m.v.el.textContent).not.toContain('6.87');
    expect(m.v.el.textContent).not.toContain('444');
    expect(m.v.el.textContent).toContain('7.21');
  });

  it("2. a pending row with the engine's times, then the result at the tick its labResult arrives, flagged and marked", () => {
    const m = mount();
    const tick = 12_100; // drawn at 242 s = 04:02
    m.send('abg', tick);
    const drawn = tick * TICK_S;
    const due = drawn + turnaroundFor('abg'); // the ABL825 row's 80 s (Radiometer 928-544), not a number typed in the view
    const [row] = m.rows();
    expect(row?.querySelector('.lr-lab-title')?.textContent).toBe(LABS_WORDS.drawn('Arterial blood gas', drawn));
    expect(row?.querySelector('.lr-lab-state')?.textContent).toBe(LABS_WORDS.expected(due, ANALYSERS.abl825.name, 'poc'));
    expect(row?.querySelector('.lr-lab-state')?.textContent).toBe(`Result expected ${clock(due)} (Radiometer ABL825 FLEX, analyser time only)`);
    expect(row?.querySelector('table')).toBeNull();
    // the engine's other events before the turnaround: still pending
    m.engine({ type: 'labs', t: due - 1, values: TRUTH });
    expect(row?.querySelector('table')).toBeNull();
    m.result('abg', drawn, ABG);
    expect(row?.querySelector('.lr-lab-state')?.textContent).toBe(LABS_WORDS.resulted(due));
    const k = row?.querySelector('tr[data-key="k"]');
    expect(k?.classList.contains('high')).toBe(true);
    expect(k?.classList.contains('crit')).toBe(true); // 6.3 ≥ the Kost list's 6.0
    expect(row?.querySelector('tr[data-key="ph"]')?.classList.contains('low')).toBe(true);
    expect(row?.querySelectorAll('tbody tr')).toHaveLength(Object.keys(ABG).length);
  });

  it("2b. with a real engine: the draw at the host's ack tick, the result exactly at the engine's labResult, not a tick before", () => {
    const e = createEngine({ seed: 3, mode: 'modeled' });
    const m = mount();
    e.on((x) => m.engine(x)); // this phone's engine: every event it emits, the 1 Hz labs truth included
    e.advanceTo(30);
    m.v.el.querySelector<HTMLButtonElement>('.lr-lab-send[data-panel="abg"]')!.click();
    const cmd = m.sent.at(-1)!;
    const r = e.dispatch({ ...cmd, issuedBy: 'learner' } as unknown as Command); // the host applies it (its engine and this phone's are the same build)
    expect(r.accepted).toBe(true);
    m.ack(cmd.id, true, r.tick);
    const due = r.tick * TICK_S + turnaroundFor('abg');
    const row = () => m.rows()[0]!;
    e.advanceTo(due - TICK_S);
    expect(row().querySelector('.lr-lab-state')?.getAttribute('data-state')).toBe('pending');
    expect(row().querySelector('tbody tr')).toBeNull();
    let at: number | null = null;
    e.on((x) => void (x.type === 'labResult' && (at = x.t)));
    e.advanceTo(due + 1);
    expect(at).toBeCloseTo(due, 9);
    expect(row().querySelector('.lr-lab-state')?.textContent).toBe(LABS_WORDS.resulted(due));
    expect(row().querySelectorAll('tbody tr').length).toBeGreaterThan(10);
  });

  it("the laboratory panels: the laboratory row's turnaround, its own words, and only what the engine gives", () => {
    const m = mount();
    m.send('chem', 500);
    m.send('coag', 600);
    const [coag, chem] = m.rows(); // the latest draw first
    expect(chem?.querySelector('.lr-lab-state')?.textContent).toBe(`Result expected ${clock(500 * TICK_S + turnaroundFor('chem'))} (Hospital laboratory, laboratory time only, transport not included)`);
    expect(coag?.querySelector('.lr-lab-state')?.textContent).toBe(LABS_WORDS.expected(600 * TICK_S + turnaroundFor('coag'), LABORATORY.name, 'laboratory'));
    m.result('chem', 500 * TICK_S, { na: 141, k: 4.1, cl: 103, mg: 0.82, glucose: 101 });
    expect([...chem!.querySelectorAll('tbody tr')].map((r) => (r as HTMLElement).dataset.key)).toEqual(['na', 'k', 'cl', 'mg', 'glucose']);
    m.result('coag', 600 * TICK_S, {}); // no INR without the organ model: nothing made up
    expect(coag?.querySelector('tbody tr')).toBeNull();
    expect(coag?.querySelector('.lr-lab-none')?.textContent).toBe(LABS_WORDS.noValues);
  });

  it("3. another device's or the instructor's sample is not shown; earlier results stay listed by draw time", () => {
    const m = mount();
    // another phone's draw and the instructor's: the host's commandApplied goes to every follower, their labResult too
    m.applied(900, { id: 'other1', type: 'applyEvent', event: { kind: 'lab', panel: 'abg' }, issuedBy: 'learner', by: 'otherkey0002' });
    m.applied(950, { id: 'inst1', type: 'applyEvent', event: { kind: 'lab', panel: 'chem' }, issuedBy: 'instructor' });
    m.result('abg', 900 * TICK_S, ABG);
    m.result('chem', 950 * TICK_S, { na: 150 });
    expect(m.rows()).toHaveLength(0);
    expect(m.v.el.querySelector('table')).toBeNull();
    // this phone's own two samples, and one of another device drawn on the same panel at another tick
    m.send('abg', 1000);
    m.send('abg', 4000);
    m.result('abg', 2000 * TICK_S, { ...ABG, ph: 7.01 }); // drawn at another tick: not this phone's
    m.result('abg', 1000 * TICK_S, ABG);
    m.result('abg', 4000 * TICK_S, { ...ABG, ph: 7.4 });
    const rows = m.rows();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.querySelector('tr[data-key="ph"] .v')?.textContent?.trim())).toEqual(['7.4', '7.21 ↓']);
    expect(m.v.el.textContent).not.toContain('7.01');
  });

  it("a refusal is the host's words; a restart clears the list", () => {
    const m = mount();
    m.v.el.querySelector<HTMLButtonElement>('.lr-lab-send[data-panel="abg"]')!.click();
    m.ack(m.sent[0]!.id, false, 0, 'the case is paused');
    expect(m.v.el.querySelector('.lr-lab-said')?.textContent).toBe(LABS_WORDS.notSent('the case is paused'));
    expect(m.rows()).toHaveLength(0);
    m.send('vbg', 100);
    expect(m.rows()).toHaveLength(1);
    m.from({ kind: 'event', body: [{ type: 'timeline', t: 0, tick: 0 }] });
    expect(m.rows()).toHaveLength(0);
    expect(m.v.el.querySelector('.lr-lab-empty')?.hasAttribute('hidden')).toBe(false);
  });

  it("the host's own analyser on the applied event names the row and its time", () => {
    const m = mount();
    const cmd = m.send('abg', 300);
    m.applied(300, { ...cmd, event: { kind: 'lab', panel: 'abg', analyser: 'abl837' }, issuedBy: 'learner', by: DEVICE });
    expect(m.rows()[0]?.querySelector('.lr-lab-state')?.textContent).toBe(LABS_WORDS.expected(300 * TICK_S + turnaroundFor('abg', 'abl837'), ANALYSERS.abl837.name, 'poc'));
  });
});
