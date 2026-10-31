// @vitest-environment happy-dom
// The Instructor v2 dock (plan IP4, IP7): the three marks send today's bookmark command plus IP2's `kind` (and the note
// field's text as IP2's `note`, marks-note.dom.test.ts) under their own label and counter (plan R10); Debrief sits at the
// far right and is lit once the case has ended.
import { ScenarioView, type AckResult, type AnyScenarioDoc, type CommandInput, type ScenarioDoc, type WireEvent } from '@pme/controller';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bookmark } from '../commands.ts';
import type { Link } from '../link.ts';
import { anyShowcaseDoc } from '../showcase/harness.ts';
import { archive } from '../archive.ts';
import { MemoryStorage } from '../memory-storage.ts';
import { RunRecord } from '../record.ts';
import { caseFinished, FINISHED, mountDock } from './dock.ts';
import type { Teach2Ctx } from './ctx.ts';
import { mountFinish } from './finish.ts';

const settle = () => new Promise((r) => setTimeout(r, 0));
const toasts = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent);

function rig(reply: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 }) {
  const sent: CommandInput[] = [];
  const sv = new ScenarioView();
  const link = { ctl: { scenario: sv }, simT: 500, send: async (c: CommandInput) => (sent.push(structuredClone(c)), reply) } as unknown as Link;
  const dock = mountDock(link);
  document.body.append(dock.el);
  return { sent, sv, dock };
}

beforeEach(() => document.body.replaceChildren());

describe('Instructor v2 dock', () => {
  it('each mark sends today\'s bookmark command with its kind, labelled "Mark n at mm:ss" on its own counter', async () => {
    const r = rig();
    const marks = [...r.dock.el.querySelectorAll<HTMLButtonElement>('.ip2-mark')];
    expect(marks.map((b) => b.getAttribute('aria-label'))).toEqual(['Mark: good', 'Mark: bad', 'Mark: discuss']);
    for (const b of marks) b.click();
    await settle();
    const kinds = ['good', 'bad', 'discuss'];
    expect(r.sent).toEqual([1, 2, 3].map((n) => ({ type: 'scenario', action: 'bookmark', target: `Mark ${n} at 08:20`, kind: kinds[n - 1] })));
    expect(toasts()).toEqual(['Mark 1 at 08:20 saved', 'Mark 2 at 08:20 saved', 'Mark 3 at 08:20 saved']);
    // the same command as today's Bookmark plus the kind: only the label differs
    const today: CommandInput[] = [];
    await bookmark({ simT: 500, send: async (c: CommandInput) => (today.push(c), { accepted: true }) } as unknown as Link);
    const { kind, ...rest } = r.sent[0] as CommandInput & { kind?: string };
    expect(kind).toBe('good');
    expect(Object.keys(today[0] ?? {}).sort()).toEqual(Object.keys(rest).sort());
    expect({ ...today[0], target: '' }).toEqual({ ...rest, target: '' });
    expect((today[0] as { target: string }).target).toMatch(/^Bookmark \d+ at 08:20$/);
  });

  it('a refused mark says so', async () => {
    const r = rig({ accepted: false, reason: 'no', tick: 0, commandId: 'c1', rttMs: 0 });
    r.dock.el.querySelector<HTMLButtonElement>('.ip2-mark')?.click();
    await settle();
    expect(toasts()).toEqual(['Mark not saved']);
  });

  it('the order: Tools, the marks and the note area, Debrief last; Debrief lit when the case has ended', () => {
    const r = rig();
    const kids = [...r.dock.el.children];
    expect(kids.indexOf(r.dock.tools)).toBeLessThan(kids.indexOf(r.dock.el.querySelector('.ip2-dock-mid') as Element));
    expect(r.dock.el.querySelector('.ip2-dock-mid')?.contains(r.dock.note)).toBe(true);
    const debrief = kids.at(-1) as HTMLAnchorElement;
    expect(debrief.textContent).toBe('Debrief');
    expect(debrief.getAttribute('href')).toBe('#/debrief');
    r.dock.refresh();
    expect(debrief.dataset.ready).toBe('false');
    r.sv.doc = { schema: 'pme-scenario/1', id: 't', title: 'T', initialState: 'end', states: [{ id: 'end', label: 'End' }] } as ScenarioDoc;
    r.sv.stateId = 'end';
    r.dock.refresh();
    expect(debrief.dataset.ready).toBe('true');
  });
});

// F11 found the Debrief "ready" flag never true on the MH /2 card: every phase has a next, and ready was "no next" alone.
// Ready for a /2 card (design §6, Q11: the run's end): the case is in one of its end phases (no next), or the instructor
// finished the case: "Finish the case" (#214's pane, teach2/finish.ts) writes "Case finished" into the record of a /2
// card when one of its buttons saves the debrief. A /1 card is lit as today.
describe('Instructor v2 dock: the Debrief ready flag of a /2 card', () => {
  function rig2(doc: AnyScenarioDoc, stateId: string) {
    const sv = new ScenarioView();
    sv.doc = doc;
    sv.docVersion = 1;
    sv.stateId = stateId;
    const record = new RunRecord(() => ({ patient: 'M 35 y 80 kg', weightKg: 80 }), () => Date.UTC(2026, 10, 1, 9, 0));
    record.wire({ type: 'commandApplied', commandId: 'c0', tick: 0, resolved: { command: { id: 'c0', issuedBy: 'instructor', type: 'scenario', action: 'load', doc } } } as unknown as WireEvent);
    const link = {
      ctl: { scenario: sv, hostPaused: false }, simT: 1471, host: { record, driver: { markStages: () => undefined, stageMarks: () => [], vitalHolds: () => [] } },
      send: async (c: CommandInput) => ({ accepted: true, tick: 0, commandId: String(c.type), rttMs: 0 }),
      note: (text: string) => record.note(1471, text),
    } as unknown as Link;
    let finishing = false;
    const dock = mountDock(link, { finish: () => void (finishing = true), canFinish: () => true, finishing: () => finishing });
    document.body.append(dock.el);
    const debrief = dock.el.querySelector('.ip2-debrief') as HTMLAnchorElement;
    const finish = dock.el.querySelector('.ip2-finish-btn') as HTMLButtonElement;
    return { link, record, dock, debrief, finish };
  }

  it('the MH /2 card in Treated (it has a next): not ready until the record holds "Case finished"; then ready', () => {
    const r = rig2(anyShowcaseDoc('showcase-mh-v2') as AnyScenarioDoc, 'treated');
    r.dock.refresh();
    expect(r.finish.hidden).toBe(false);
    expect(r.debrief.dataset.ready).toBe('false');
    expect(caseFinished(r.link)).toBe(false);
    r.link.note(FINISHED, 'marker');
    r.dock.refresh();
    expect(caseFinished(r.link)).toBe(true);
    expect(r.debrief.dataset.ready).toBe('true');
    expect([...r.dock.el.children].at(-1)).toBe(r.debrief); // Debrief stays the dock's last item
  });

  it('Finish the case on a /2 card: "Debrief now" writes "Case finished" into the record before the archive saves it', async () => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    const r = rig2(anyShowcaseDoc('showcase-mh-v2') as AnyScenarioDoc, 'treated');
    const el = document.createElement('div');
    const ctx = { link: r.link, keys: { escape: () => () => undefined } } as unknown as Teach2Ctx;
    const f = mountFinish(el, ctx, () => undefined, { restart: () => true, close: () => undefined });
    f.start();
    await settle();
    (el.querySelector('.ip2-finish-now') as HTMLButtonElement).click();
    expect(r.record.data.rows.filter((x) => x.kind === 'note').map((x) => x.text)).toEqual([FINISHED]);
    const saved = archive.list().at(0);
    expect(saved && archive.debrief(saved.id)?.includes(FINISHED)).toBe(true);
    f.destroy();
  });

  it('a /1 card: its Debrief is lit as today (no next), whatever the record holds', () => {
    const r = rig2({ schema: 'pme-scenario/1', id: 't', title: 'T', initialState: 'a', states: [{ id: 'a', label: 'A', transitions: [{ id: 'go', to: 'a', when: { manual: { label: 'Go' } } }] }] } as unknown as AnyScenarioDoc, 'a');
    r.dock.refresh();
    expect(r.debrief.dataset.ready).toBe('false');
  });
});
