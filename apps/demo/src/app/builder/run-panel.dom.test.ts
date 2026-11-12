// @vitest-environment happy-dom
// B6 (scenario-builder.md §6): Run in place loads the draft into this computer's session as a draft card: the session's
// own load with the document itself, never the library, the imported cards, Recent or an id another device could name;
// a phone's Remote cannot load any card, and the driver resolves a string id against the built-in cards only. Refused
// at any refusal; a restart runs the draft again; the panel sits beside Instructor v2 while the draft runs.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { instructorMay } from '@pme/controller';
import { PhaseRunner, ScenarioDriver, type ScenarioDocV2 } from '@pme/controller/scenario';
import { importedCards, LIBRARY, scenarioById } from '../scenarios.ts';
import type { Link } from '../link.ts';
import { draftRun, runRefusals } from './run-panel.ts';

const MH2 = LIBRARY.find((c) => c.id === 'showcase-mh-v2')!.doc as unknown as ScenarioDocV2;
const DRAFT = { ...structuredClone(MH2), id: 'my-mh-draft', title: 'My MH draft' } as ScenarioDocV2;

let m: Map<string, string>;
beforeEach(() => {
  m = new Map();
  vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() });
  location.hash = '#/scenarios/builder/d1';
});
afterEach(() => vi.unstubAllGlobals());

/** A host page's link with a stand-in session: its load starts a real phase runner on the document it was given. */
function rig() {
  const loads: unknown[] = [];
  let runner: PhaseRunner | null = null;
  const host = {
    live: false,
    loadScenario: vi.fn((doc: unknown) => {
      loads.push(doc);
      runner = new PhaseRunner(doc as ScenarioDocV2);
      runner.start(0);
      return { ok: true as const, doc: doc as ScenarioDocV2 };
    }),
    setLearner: vi.fn(),
    driver: { get phaseRunner() { return runner; }, markStages: vi.fn(), stageMarks: () => [], reviseMarks: vi.fn(() => 0) },
    host: { fastForwardToNextPhase: vi.fn(async () => ({ accepted: true, tick: 0 })) },
  };
  const link = { host, ctl: { fastForward: null, hostPaused: false }, send: vi.fn(async () => ({ accepted: true })), onChange: () => () => undefined, note: vi.fn() } as unknown as Link;
  const root = document.createElement('div');
  const saved = { savedAt: 1, doc: structuredClone(DRAFT) as unknown };
  const d = draftRun({ link, root, drafts: { get: () => ({ savedAt: saved.savedAt }) as never, body: async () => saved.doc as never }, width: () => 1920 });
  return { d, host, link, root, loads, saved };
}

describe('Run in place: the draft never enters the library or the wire as an id', () => {
  it('loads the document itself into this session, marks on first; nothing is kept as an imported card or in Recent', () => {
    const { d, host, loads, root, link } = rig();
    expect(d.run('d1', DRAFT)).toEqual({ ok: true });
    expect(host.driver.markStages).toHaveBeenCalledWith(true);
    expect(host.driver.markStages.mock.invocationCallOrder[0]!).toBeLessThan(host.loadScenario.mock.invocationCallOrder[0]!); // the first phase gets its mark
    expect(loads).toEqual([DRAFT]);
    expect(typeof loads[0]).toBe('object'); // the document, never an id to look up
    expect(host.setLearner).toHaveBeenCalledWith(false);
    expect(importedCards()).toEqual([]);
    expect(scenarioById(DRAFT.id)).toBeUndefined();
    expect(m.has('pme.recent-cards')).toBe(false);
    expect([...m.keys()]).toEqual([]); // nothing of the draft in this browser's storage at all
    expect(location.hash).toBe('#/teach2');
    expect(d.current()?.draftId).toBe('d1');
    expect((link.note as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe('Draft run in place: My MH draft (not in the library)');
    // the panel beside Instructor v2
    expect(root.getAttribute('data-run')).toBe('open');
    expect(root.querySelector('.sb-run')?.hasAttribute('hidden')).toBe(false);
    expect(root.querySelector('.sb-run-log')?.textContent).toContain('the card starts here');
  });

  it('refuses a draft the validator refuses, or one with a library card’s id, and loads nothing', () => {
    const { d, loads } = rig();
    const lib = d.run('d1', { ...DRAFT, id: 'showcase-mh-v2' });
    expect(lib.ok).toBe(false);
    expect((lib as { reason: string }).reason).toMatch(/library card has the id/);
    expect(d.run('d1', { ...DRAFT, phases: [] }).ok).toBe(false);
    expect(loads).toEqual([]);
    expect(runRefusals(DRAFT)).toEqual([]);
  });

  it('no remote can make the host load it: a remote load is refused whatever it carries, and an id names built-in cards only', () => {
    expect(instructorMay({ id: 'x', issuedBy: 'remote', type: 'scenario', action: 'load', target: DRAFT.id })).toBe("Load the case on the instructor's computer.");
    expect(instructorMay({ id: 'x', issuedBy: 'remote', type: 'scenario', action: 'load', doc: DRAFT } as never)).toBe("Load the case on the instructor's computer.");
    const target = { now: () => ({ tick: 0, simT: 0 }), dispatch: () => ({ accepted: true, tick: 0 }), snapshot: () => ({}) as never, restore: () => undefined, on: () => () => undefined, time: () => undefined };
    const driver = new ScenarioDriver({ target: target as never });
    expect(driver.load(DRAFT.id)).toEqual({ ok: false, reason: `no built-in scenario ${DRAFT.id}` });
  });

  it('a restart runs the draft again as it runs; a library load ends the draft run and the panel goes', () => {
    const { d, loads, root } = rig();
    d.run('d1', DRAFT);
    expect(d.restart({})).toBe(true);
    expect(loads).toEqual([DRAFT, DRAFT]);
    d.end();
    expect(d.current()).toBeNull();
    expect(root.hasAttribute('data-run')).toBe(false);
    expect(d.restart({})).toBe(false);
  });

  it('Apply from this phase’s mark waits for an edit, and says why while it cannot run', async () => {
    const { d, root, saved } = rig();
    d.run('d1', DRAFT);
    const btn = () => [...root.querySelectorAll('button')].find((b) => b.textContent === 'Apply from this phase’s mark')!;
    const why = () => root.querySelector('.sb-run-why')?.textContent ?? '';
    await vi.waitFor(() => expect(why()).toBe('No edits since this run started.'));
    expect(btn().disabled).toBe(true);
    saved.savedAt = 2;
    saved.doc = { ...structuredClone(DRAFT), phases: [] };
    await vi.waitFor(() => expect(why()).toMatch(/^The draft has \d+ refusals?: fix/), { timeout: 3000 });
    saved.savedAt = 3;
    saved.doc = { ...structuredClone(DRAFT), title: 'My MH draft, edited' };
    await vi.waitFor(() => expect(why()).toMatch(/^This phase has no mark yet/), { timeout: 3000 }); // the stand-in driver placed none
    expect(btn().disabled).toBe(true);
  });
});
