// @vitest-environment happy-dom
// The Instructor v2 dock (plan IP4, IP7): the three marks send today's bookmark command plus IP2's `kind` (and the note
// field's text as IP2's `note`, marks-note.dom.test.ts) under their own label and counter (plan R10); Debrief sits at the
// far right and is lit once the case has ended.
import { ScenarioView, type AckResult, type CommandInput, type ScenarioDoc } from '@pme/controller';
import { beforeEach, describe, expect, it } from 'vitest';
import { bookmark } from '../commands.ts';
import type { Link } from '../link.ts';
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
