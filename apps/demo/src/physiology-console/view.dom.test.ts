// @vitest-environment happy-dom
// The console page controller against a real engine on the main thread (no monitor, no canvas: happy-dom has no 2D
// context, so sparklines are skipped and the numbers still render). The engine is advanced by hand.
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent, type MonitorEngine, type TruthTree } from '@pme/engine-core';
import { PRESETS } from './actions.ts';
import { mountConsole, type ConsoleHandle, type ConsoleHost } from './view.ts';

const flush = () => new Promise((r) => setTimeout(r, 0));
let ui: ConsoleHandle | null = null;
afterEach(() => {
  ui?.destroy();
  ui = null;
});

function rig() {
  let e: MonitorEngine = createEngine({ seed: 7, mode: 'modeled', patient: PRESETS[0]?.profile, truthHz: 1 });
  const fns = new Set<(x: EngineEvent) => void>();
  const wire = () => e.on((x) => fns.forEach((fn) => fn(x)));
  wire();
  let n = 0;
  const restarts: string[] = [];
  const host: ConsoleHost = {
    dispatch: async (b) => e.dispatch({ ...b, id: `c${++n}`, issuedBy: 'test' } as unknown as Command),
    on: (fn) => {
      fns.add(fn);
      return () => fns.delete(fn);
    },
    snapshot: async () => e.snapshot(),
    restore: async (s) => e.restore(s),
    restart: (id, mode) => {
      restarts.push(`${id}/${mode}`);
      e = createEngine({ seed: 7, mode, patient: PRESETS.find((p) => p.id === id)?.profile, truthHz: 1 });
      wire();
    },
    timeScale: () => undefined,
    pause: () => undefined,
  };
  ui = mountConsole(document.body, host, { autoBaselineS: 15 });
  const q = <T extends Element>(sel: string) => document.querySelector(sel) as T;
  const click = (act: string) => q<HTMLButtonElement>(`[data-act="${act}"]`).click();
  return { ui, q, click, restarts, advance: (t: number) => e.advanceTo(t), engine: () => e };
}

/** A host without an engine: the test emits the events and sees every dispatched body. */
function fakeHost(restore: () => Promise<void> = async () => undefined) {
  const fns = new Set<(x: EngineEvent) => void>();
  const sent: unknown[] = [];
  const host: ConsoleHost = {
    dispatch: async (b) => (sent.push(b), { accepted: true }),
    on: (fn) => (fns.add(fn), () => fns.delete(fn)),
    snapshot: async () => ({ schema: 'pme-snapshot/1', engineVersion: 'x', seed: 1, tick: 0, state: {} }),
    restore,
    restart: () => undefined,
    timeScale: () => undefined,
    pause: () => undefined,
  };
  const emit = (e: EngineEvent) => fns.forEach((fn) => fn(e));
  const truthAt = (t: number, tree: TruthTree = { hemo: { circ: { p: { rSys: 0.9 } } } }) => emit({ type: 'truth', t, tree, leaves: 1, dropped: 0, truncated: false });
  return { host, emit, truthAt, sent };
}

describe('physiology console page', { timeout: 30_000 }, () => {
  it('shows organ sections with rows, auto-sets the baseline at 15 s, and lists no change before one is made', async () => {
    const { q, advance } = rig();
    advance(20);
    await flush();
    expect(q('[data-id="base"]').textContent).toBe('baseline @ 0:15');
    expect((q('[data-act="reset"]') as HTMLButtonElement).disabled).toBe(false);
    const sec = q<HTMLDetailsElement>('details[data-group="circulation"]');
    expect(sec.hidden).toBe(false);
    expect(sec.querySelector('tr[data-path="ev.circ.svr"] .lbl')?.textContent).toBe('SVR');
    expect(q('tr[data-path="ev.circ.svr"] .u').textContent).toBe('dyn·s/cm⁵');
    expect(q('details[data-group="monitor"] tr[data-path="mon.hr"]')).not.toBeNull();
    expect(q<HTMLDetailsElement>('details[data-group="devices"]').hidden).toBe(false);
    expect(document.querySelectorAll('.pc-log li')).toHaveLength(0);
    expect(q<HTMLTableRowElement>('tr[data-path="l1.vars.sbp.t0"]').hidden).toBe(true); // internals off by default
  });
  it('phenylephrine: one change-log entry, accepted; SVR delta turns positive and the row highlights', async () => {
    const { q, click, advance } = rig();
    advance(20);
    await flush();
    click('bolus'); // the rail's defaults: phenylephrine 100 mcg
    await flush();
    const li = document.querySelectorAll('.pc-log li[data-kind="cmd"]');
    expect(li).toHaveLength(1);
    expect(li[0]?.textContent).toContain('phenylephrine 100 mcg iv');
    expect(li[0]?.className).toBe('ok');
    advance(60);
    await flush();
    const row = q<HTMLTableRowElement>('tr[data-path="ev.circ.svr"]');
    expect(row.querySelector('.d')?.textContent).toMatch(/^\+\d+/);
    expect(row.className).toBe('up');
    expect(q('details[data-group="circulation"] .pc-count').textContent).toMatch(/changed/);
  });
  it('a rejected command shows its reason; bad raw JSON is logged, not thrown', async () => {
    const { q, click, advance } = rig();
    advance(2);
    q<HTMLInputElement>('[data-f="drug"]').value = 'notADrug';
    click('bolus');
    q<HTMLTextAreaElement>('[data-f="raw"]').value = '{nope';
    click('raw');
    await flush();
    const li = [...document.querySelectorAll('.pc-log li')];
    expect(li.map((l) => l.className)).toEqual(['rej', 'rej']);
    expect(li[1]?.textContent).toContain('rejected:');
    expect(li[0]?.textContent).toContain('bad JSON');
  });
  it('filter, changed-only and internals toggle row visibility', async () => {
    const { q, advance } = rig();
    advance(20);
    await flush();
    const f = q<HTMLInputElement>('[data-id="filter"]');
    f.value = 'svr';
    f.dispatchEvent(new Event('input'));
    expect(q<HTMLTableRowElement>('tr[data-path="ev.circ.svr"]').hidden).toBe(false);
    expect(q<HTMLTableRowElement>('tr[data-path="ev.circ.co"]').hidden).toBe(true);
    expect(q<HTMLDetailsElement>('details[data-group="lungs"]').hidden).toBe(true);
    f.value = '';
    const ch = q<HTMLInputElement>('[data-id="changed"]');
    ch.checked = true;
    ch.dispatchEvent(new Event('input'));
    expect(q<HTMLTableRowElement>('tr[data-path="resp.pat.weightKg"]').hidden).toBe(true); // a constant never shows as changed
    ch.checked = false;
    const inn = q<HTMLInputElement>('[data-id="internals"]');
    inn.checked = true;
    inn.dispatchEvent(new Event('input'));
    expect(q<HTMLTableRowElement>('tr[data-path="l1.vars.sbp.t0"]').hidden).toBe(false);
  });
  it('reset to baseline restores the engine: SVR returns to baseline and the log marks it', async () => {
    const { q, click, advance, ui: h } = rig();
    advance(20);
    await flush();
    click('bolus');
    await flush();
    advance(60);
    await flush();
    await h.resetToBaseline();
    advance(17);
    await flush();
    expect(q('tr[data-path="ev.circ.svr"]').className).toBe('');
    expect(q('.pc-log li').textContent).toContain('reset to baseline @ 0:15');
    expect(h.model.t).toBe(17);
    expect(q('[data-id="t"]').textContent).toBe('0:17'); // the clock went back with the engine
  });
  it('after a reset the clock ignores events from the discarded timeline and follows the restored one', async () => {
    const f = fakeHost();
    ui = mountConsole(document.body, f.host, { autoBaselineS: 2 });
    for (let t = 1; t <= 3; t++) f.truthAt(t);
    await flush(); // the auto-baseline at 2 s took its snapshot
    for (let t = 4; t <= 80; t++) f.truthAt(t);
    expect(document.querySelector('[data-id="t"]')?.textContent).toBe('1:20');
    await ui.resetToBaseline();
    // a worker delivers what it had batched before the restore AFTER the reply: stale beats, then the restore's
    // toneCancel, then the new timeline
    f.emit({ type: 'circ', t: 80.5 } as unknown as EngineEvent);
    expect(document.querySelector('[data-id="t"]')?.textContent).toBe('0:02');
    f.emit({ type: 'toneCancel', after: 2 });
    f.emit({ type: 'circ', t: 2.5 } as unknown as EngineEvent);
    f.truthAt(3);
    expect(document.querySelector('[data-id="t"]')?.textContent).toBe('0:03');
    expect(document.querySelector('.pc-log li')?.textContent).toContain('0:02 reset to baseline @ 0:02');
  });
  it('without a toneCancel, the first truth event after the restore re-syncs the clock', async () => {
    const f = fakeHost();
    ui = mountConsole(document.body, f.host, { autoBaselineS: 2 });
    for (let t = 1; t <= 50; t++) f.truthAt(t);
    await flush();
    await ui.resetToBaseline();
    f.emit({ type: 'circ', t: 50.2 } as unknown as EngineEvent);
    f.truthAt(3);
    f.truthAt(4);
    expect(document.querySelector('[data-id="t"]')?.textContent).toBe('0:04');
  });
  it('the rail sends 7b lung, 7c fluid/lab and 7g TCI/N2O bodies', async () => {
    const f = fakeHost();
    ui = mountConsole(document.body, f.host);
    expect(document.querySelector('[data-id="base"]')?.textContent).toBe('baseline: pending (auto at 1:00)');
    const set = (id: string, v: string) => ((document.querySelector(`[data-f="${id}"]`) as HTMLInputElement).value = v);
    const click = (act: string) => (document.querySelector(`[data-act="${act}"]`) as HTMLButtonElement).click();
    set('drug', 'propofol');
    set('tciModel', 'eleveld');
    click('tci');
    set('n2o', '0.5');
    click('vap');
    set('fluid', 'rl');
    click('fluid');
    click('lab');
    set('lcond', 'ptxSimple');
    set('side', 'L');
    click('lcond');
    set('mainstem', 'right');
    click('mainstem');
    click('recruit');
    await flush();
    expect(f.sent.map((b) => (b as { event: unknown }).event)).toEqual([
      { kind: 'tci', drugId: 'propofol', model: 'eleveld', mode: 'effect', target: 3 },
      { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, n2oFrac: 0.5 },
      { kind: 'fluid', fluid: 'rl', volumeMl: 500, overS: 300 },
      { kind: 'lab', panel: 'abg' },
      { kind: 'lungCondition', id: 'ptxSimple', severity: 0.5, side: 'L' },
      { kind: 'mainstem', ventilated: 'right' },
      { kind: 'recruit', pressureCmH2O: 40, durationS: 30 },
    ]);
    expect(document.querySelectorAll('.pc-log li.ok')).toHaveLength(7);
  });
  it('a path that leaves the truth tree loses its row', async () => {
    const fns = new Set<(x: EngineEvent) => void>();
    const fake: ConsoleHost = {
      dispatch: async () => ({ accepted: true }),
      on: (fn) => (fns.add(fn), () => fns.delete(fn)),
      snapshot: async () => ({ schema: 'pme-snapshot/1', engineVersion: 'x', seed: 1, tick: 0, state: {} }),
      restore: async () => undefined,
      restart: () => undefined,
      timeScale: () => undefined,
      pause: () => undefined,
    };
    ui = mountConsole(document.body, fake);
    const emit = (t: number, tree: TruthTree) => fns.forEach((fn) => fn({ type: 'truth', t, tree, leaves: 1, dropped: 0, truncated: false }));
    emit(1, { hemo: { lvad: { rpm: 5400 } }, organs: { renal: { gfr: 110 } } });
    expect(document.querySelector('details[data-group="kidney"] tr[data-path="organs.renal.gfr"]')).not.toBeNull();
    expect((document.querySelector('details[data-group="devices"]') as HTMLDetailsElement).hidden).toBe(false);
    emit(2, { organs: { renal: { gfr: 100 } } });
    expect(document.querySelector('tr[data-path="hemo.lvad.rpm"]')).toBeNull();
    expect((document.querySelector('details[data-group="devices"]') as HTMLDetailsElement).hidden).toBe(true);
  });
  it('restart remounts the patient and forgets the old baseline; export gives JSON and CSV', async () => {
    const { click, q, restarts, advance, ui: h } = rig();
    advance(20);
    await flush();
    q<HTMLSelectElement>('[data-f="preset"]').value = 'child';
    click('restart');
    expect(restarts).toEqual(['child/modeled']);
    expect(h.model.base).toBeNull();
    expect(q('[data-id="base"]').textContent).toMatch(/pending/);
    advance(5);
    await flush();
    const j = JSON.parse(h.exportJSON()) as { schema: string; values: Record<string, { value: unknown }> };
    expect(j.schema).toBe('pme-console/1');
    expect(j.values['resp.pat.weightKg']?.value).toBe(20);
    expect(h.exportCSV()).toContain('\ncirculation,ev.circ.svr,SVR,');
  });
});
