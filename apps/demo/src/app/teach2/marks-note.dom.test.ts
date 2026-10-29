// @vitest-environment happy-dom
// The dock's marks and note field, and the Log sheet's marks list (plan IP7; answer 13), on a real Link over the
// in-process hub: Enter in the note field writes a note (the Log tab's note); a mark sends today's bookmark command with
// its kind (IP2), and the field's text as its note, clearing the field; the Log sheet lists the instructor's marks and
// bookmarks with their kinds (the driver's stage marks are never listed) and "Return here" sends today's restore.
import { ControllerSession, createInProcessHub, createStamper, type WireCommand, type WireMessage } from '@pme/controller';
import { afterEach, describe, expect, it } from 'vitest';
import { Link } from '../link.ts';
import { DEFAULT_SITE } from '../site.ts';
import type { Teach2Ctx } from './ctx.ts';
import { mountDock } from './dock.ts';
import { mountKeys } from './keys.ts';
import { mount } from './sheets.ts';

const S = 'MRK234';
const settle = () => new Promise((r) => setTimeout(r, 0));
const until = async (ok: () => boolean) => {
  for (let i = 0; i < 50 && !ok(); i++) await settle();
};

let done: Array<() => void> = [];
afterEach(() => {
  for (const f of done) f();
  done = [];
  document.body.replaceChildren();
});

function rig() {
  const hub = createInProcessHub();
  const host = hub.connect();
  const t = hub.connect();
  const ctl = new ControllerSession({ session: S, transport: t, peerId: 'ctl-m' });
  const link = new Link(ctl, t, null);
  const got: WireCommand[] = [];
  const stamp = createStamper(S, 'host-1');
  host.onMessage((m: WireMessage) => {
    if (m.kind !== 'command') return;
    got.push(m.body);
    host.send(stamp({ kind: 'ack', commandId: m.body.id, accepted: true, tick: 9 }));
  });
  /** The host applied a bookmark (what every controller hears, its own included). */
  const applied = (command: Record<string, unknown>) =>
    host.send(stamp({ kind: 'event', body: [{ type: 'commandApplied', commandId: String(command.id), tick: 10, resolved: { command } }] } as never));
  const root = document.createElement('div');
  const layer = document.createElement('div');
  const dock = mountDock(link);
  root.append(layer, dock.el);
  document.body.append(root);
  const keys = mountKeys(root, { link, togglePause: () => undefined });
  const ctx: Teach2Ctx = { link, site: DEFAULT_SITE, weightKg: () => 70, keys, dock: { tools: dock.tools, note: dock.note }, openSheet: () => undefined };
  const slot = mount(layer, ctx);
  done.push(() => (slot.destroy(), keys.destroy(), link.close(), ctl.close()));
  const field = dock.note.querySelector<HTMLInputElement>('input.ip2-note-field') as HTMLInputElement;
  const type = (text: string) => {
    field.value = text;
    field.dispatchEvent(new Event('input'));
  };
  const enter = () => field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  const markBtn = (kind: string) => dock.el.querySelector<HTMLButtonElement>(`.ip2-mark[data-kind="${kind}"]`) as HTMLButtonElement;
  return { ctl, link, got, applied, layer, dock, ctx, field, type, enter, markBtn };
}

describe('the dock\'s note field and marks', () => {
  it('Enter in the note field writes a note (the Log tab\'s note) and clears the field; an empty field writes nothing', () => {
    const r = rig();
    expect(r.field.getAttribute('aria-label')).toBe('Note');
    r.type('  Check the potassium  ');
    r.enter();
    expect(r.link.log.at(-1)).toMatchObject({ kind: 'note', text: 'Check the potassium' });
    expect(r.field.value).toBe('');
    const n = r.link.log.length;
    r.enter();
    expect(r.link.log.length).toBe(n);
  });

  it('a mark takes the field\'s text as its note and clears the field; without text it sends its kind only', async () => {
    const r = rig();
    r.type('tachycardia not noticed');
    r.markBtn('bad').click();
    expect(r.field.value).toBe('');
    await until(() => r.got.length === 1);
    expect(r.got[0]).toMatchObject({ type: 'scenario', action: 'bookmark', kind: 'bad', note: 'tachycardia not noticed' });
    expect((r.got[0] as { target?: string }).target).toMatch(/^Mark \d+ at 00:00$/);
    r.markBtn('discuss').click();
    await until(() => r.got.length === 2);
    expect(r.got[1]).toMatchObject({ type: 'scenario', action: 'bookmark', kind: 'discuss' });
    expect('note' in (r.got[1] as object)).toBe(false);
  });
});

describe('the Log sheet\'s marks list', () => {
  it('lists the marks and bookmarks with their kinds, never the driver\'s stage marks; Return here sends today\'s restore', async () => {
    const r = rig();
    r.markBtn('good').click();
    await until(() => r.got.length === 1);
    const mine = r.got[0] as unknown as Record<string, unknown>;
    r.applied(mine);
    r.applied({ id: 'scenario-1', issuedBy: 'scenario', type: 'scenario', action: 'bookmark', target: 'stage:treating', kind: 'stage', note: 'treating' });
    r.applied({ id: 'panel-9', issuedBy: 'panel', type: 'scenario', action: 'bookmark', target: 'Bookmark 1 at 00:10' });
    await until(() => r.ctl.bookmarks.length === 2);
    r.ctx.openSheet('log');
    const rows = [...r.layer.querySelectorAll<HTMLElement>('.ip2-sheet[data-sheet="log"] .ip2-mark-row')];
    expect(rows.map((li) => `${li.dataset.kind} ${li.querySelector('.ip2-mark-label')?.textContent}`)).toEqual([`good ${String(mine.target)}`, 'bookmark Bookmark 1 at 00:10']);
    (rows[1]?.querySelector('button') as HTMLButtonElement).click();
    await settle();
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.textContent).toContain('Return to this bookmark?');
    ([...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Return') as HTMLButtonElement).click();
    await until(() => r.got.length === 2);
    expect(r.got[1]).toMatchObject({ type: 'scenario', action: 'restoreBookmark', target: 'Bookmark 1 at 00:10' });
  });
});
