// @vitest-environment happy-dom
// The Instructor v2 dock (plan IP4, IP7): the three marks send today's bookmark command plus IP2's `kind` (and the note
// field's text as IP2's `note`, marks-note.dom.test.ts) under their own label and counter (plan R10); Debrief sits at the
// far right and is lit once the case has ended.
import { ScenarioView, type AckResult, type AnyScenarioDoc, type CommandInput, type ScenarioDoc } from '@pme/controller';
import { beforeEach, describe, expect, it } from 'vitest';
import { bookmark } from '../commands.ts';
import type { Link } from '../link.ts';
import { anyShowcaseDoc } from '../showcase/harness.ts';
import { mountDock } from './dock.ts';

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
// pressed Finish the case, which marks the end in the record and pauses the simulation. A /1 card is as today.
describe('Instructor v2 dock: Finish the case (a /2 card)', () => {
  function rig2(doc: AnyScenarioDoc, stateId: string) {
    const sent: CommandInput[] = [];
    const notes: Array<[string, string]> = [];
    const sv = new ScenarioView();
    sv.doc = doc;
    sv.docVersion = 1;
    sv.stateId = stateId;
    const rows: Array<{ t: number; kind: string; text: string }> = [{ t: 0, kind: 'scenario', text: `Scenario loaded: ${doc.title}` }];
    const link = {
      ctl: { scenario: sv, hostPaused: false }, simT: 1471, host: { record: { data: { rows } } },
      send: async (c: CommandInput) => (sent.push(structuredClone(c)), { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 }),
      note: (text: string, kind = 'note') => (notes.push([text, kind]), rows.push({ t: 1471, kind: 'note', text })),
    } as unknown as Link;
    const dock = mountDock(link);
    document.body.append(dock.el);
    const debrief = dock.el.querySelector('.ip2-debrief') as HTMLAnchorElement;
    const finish = [...dock.el.querySelectorAll('button')].find((b) => b.textContent === 'Finish the case') as HTMLButtonElement | undefined;
    return { sent, notes, dock, debrief, finish };
  }

  it('the MH /2 card in Treated (it has a next): not ready until Finish the case, which marks the end and pauses; then ready', async () => {
    const r = rig2(anyShowcaseDoc('showcase-mh-v2') as AnyScenarioDoc, 'treated');
    r.dock.refresh();
    expect(r.finish, 'a Finish the case button').toBeDefined();
    expect(r.finish?.hidden).toBe(false);
    expect(r.debrief.dataset.ready).toBe('false');
    r.finish?.click();
    await settle();
    expect(r.notes).toEqual([['Case finished', 'marker']]);
    expect(r.sent).toContainEqual({ type: 'time', action: 'pause' });
    r.dock.refresh();
    expect(r.debrief.dataset.ready).toBe('true');
    // Debrief stays the dock's last item
    expect([...r.dock.el.children].at(-1)).toBe(r.debrief);
  });

  it('a /1 card shows no Finish the case; its Debrief is lit as today', () => {
    const r = rig2({ schema: 'pme-scenario/1', id: 't', title: 'T', initialState: 'a', states: [{ id: 'a', label: 'A', transitions: [{ id: 'go', to: 'a', when: { manual: { label: 'Go' } } }] }] } as unknown as AnyScenarioDoc, 'a');
    r.dock.refresh();
    expect(r.finish === undefined || r.finish.hidden).toBe(true);
    expect(r.debrief.dataset.ready).toBe('false');
  });
});
