// @vitest-environment happy-dom
// The Debrief page's archive and the kit's user-data folder (brief 139 PR 2): with the kit store on, the archive line
// says the debriefs are kept "in this browser and in this kit’s user-data folder" (the builder's words), the debriefs
// the folder holds that this browser lacks are read back and listed, and "Clear the archive" says the files go too, for
// good, then deletes them; with the store off, a line under it says why, in the builder's words, and to export. The
// kit's server is faked here through the page's fetch (its own paths are tested in packages/controller).
import type { WireEvent } from '@pme/controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Link } from '../link.ts';
import { asFactory, MemoryIDB } from '../memory-idb.ts';
import { MemoryStorage } from '../memory-storage.ts';
import { RunRecord } from '../record.ts';
import type { AppSession } from '../session.ts';
import induction from '../showcase/showcase-induction.json';

const settle = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const applied = (tick: number, command: Record<string, unknown>): WireEvent =>
  ({ type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, issuedBy: 'instructor', ...command } } }) as WireEvent;
function record(startedAt: number): RunRecord {
  const r = new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 }), () => startedAt);
  r.wire(applied(0, { type: 'scenario', action: 'load', doc: induction }));
  r.wire({ type: 'scenario', t: 0, stateId: induction.initialState } as WireEvent);
  return r;
}

/** The kit's server behind the page's fetch: the debriefs' files by id. */
function kitServer(on: boolean) {
  const files = new Map<string, string>();
  const base = new URL('pme-store/', location.href).href;
  vi.stubGlobal('fetch', (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    const json = (v: unknown, code = 200) => new Response(JSON.stringify(v), { status: code });
    if (!on) return new Response('', { status: 404 });
    if (u === base) return json({ store: 'pme', folder: 'user-data', writable: true });
    if (u === `${base}debriefs/`) return json({ debriefs: [...files.keys()].map((id) => ({ id, bytes: 1, at: 0 })) });
    const id = decodeURIComponent(u.slice(`${base}debriefs/`.length));
    if (init?.method === 'PUT') return (files.set(id, String(init.body)), json({ id }));
    if (init?.method === 'DELETE') return files.delete(id) ? json({ deleted: id }) : json({}, 404);
    return files.has(id) ? new Response(files.get(id)!, { status: 200 }) : json({}, 404);
  }) as typeof fetch);
  return files;
}

describe('the Debrief page’s archive and the kit’s user-data folder', () => {
  let leave: (() => void) | undefined;
  beforeEach(() => {
    vi.resetModules(); // a fresh kit store (it asks once) and a fresh archive
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.stubGlobal('indexedDB', asFactory(new MemoryIDB()));
  });
  afterEach(() => {
    leave?.();
    document.body.replaceChildren();
    location.hash = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  const show = async (live: RunRecord) => {
    const { debriefView } = await import('./debrief.ts');
    const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
    const view = debriefView({ record: live } as unknown as AppSession, link);
    document.body.append(view.el);
    view.enter?.('');
    leave = view.leave;
    for (let i = 0; i < 10; i++) await settle(5);
    return { el: view.el, text: (s: string) => view.el.querySelector(s)?.textContent?.replace(/\s+/g, ' ').trim() ?? null };
  };

  it('on: kept in both; what the folder holds is read back and listed; Clear says the files go, for good, and deletes them', async () => {
    const files = kitServer(true);
    const { archive } = await import('../archive.ts');
    const live = record(Date.UTC(2026, 10, 10, 9));
    const e = await archive.save(live.data, 'Dr Rahimi', 'b');
    await archive.kitDone;
    if ('refused' in e) throw new Error('refused');
    expect([...files.keys()]).toEqual([e.id]);
    // a debrief another browser of the laptop saved: in the folder, not here
    const other = JSON.parse(files.get(e.id)!) as Record<string, unknown>;
    files.set('elsewhere1', JSON.stringify({ ...other, id: 'elsewhere1', runStartedAt: Date.UTC(2026, 10, 9, 9), resident: 'Dr Karimi', savedAt: Date.UTC(2026, 10, 9, 10) }));
    const r = await show(live);
    expect(r.text('#db-archive .db-arc-count')).toMatch(/^2 saved · \d+ kB, 1 today · kept in this browser and in this kit’s user-data folder$/);
    expect((r.el.querySelector('#db-archive .db-arc-kit') as HTMLElement).hidden).toBe(true);
    expect([...r.el.querySelectorAll('#db-archive .db-arc-row')].map((x) => x.getAttribute('data-id'))).toEqual(['elsewhere1', e.id]);
    ([...r.el.querySelectorAll<HTMLElement>('#db-archive button')].find((x) => x.textContent === 'Clear the archive') as HTMLElement).click();
    await settle();
    const d = document.querySelector('dialog[open]') as HTMLDialogElement;
    expect(d.textContent).toContain('Every saved debrief in this browser, and its file in this kit’s user-data folder, is deleted, for good (the folder has no recycle bin). Export them first to keep them.');
    ([...d.querySelectorAll('button')].find((x) => x.textContent === 'Clear') as HTMLElement).click();
    for (let i = 0; i < 10; i++) await settle(5);
    expect(files.size).toBe(0);
    expect(r.text('#db-archive .db-arc-count')).toBe('Nothing saved in this browser or in this kit’s user-data folder. “Finish the case” in Instructor v2 saves each run here.');
  });

  it('off (not a kit): the archive line as before, and under it why the folder does not keep them, in the builder’s words', async () => {
    kitServer(false);
    const { archive } = await import('../archive.ts');
    const live = record(Date.UTC(2026, 10, 10, 9));
    await archive.save(live.data, 'Dr Rahimi', 'b');
    const r = await show(live);
    expect(r.text('#db-archive .db-arc-count')).toMatch(/^1 saved · \d+ kB, 1 today · kept in this browser until you clear it$/);
    expect(r.text('#db-archive .db-arc-kit')).toBe('Not kept in a kit’s user-data folder: the app is not running from a kit. Export a file to keep this work.');
    expect((r.el.querySelector('#db-archive .db-arc-kit') as HTMLElement).hidden).toBe(false);
  });
});
