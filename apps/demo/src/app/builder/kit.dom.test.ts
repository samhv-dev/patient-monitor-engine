// @vitest-environment happy-dom
// The builder's layer 2 (docs/plans/scenario-builder.md §8, piece B8; the owner's ruling of 10 November 2026): with the
// kit store on, Ctrl+S, Export and the 2-min timer keep the draft as a new version in the kit's user-data folder (the
// same bytes write nothing); the drafts page lists the cards the folder holds that this browser lacks and opens one at
// its newest version; the store line says where the work is kept, or why the folder is not written, and to export a
// file. The store's server is faked here (the relay's own paths are tested in packages/controller, and through the real
// relay in e2e/kit-store.e2e.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KitStore } from '../kit-store.ts';
import { asFactory, MemoryIDB } from '../memory-idb.ts';
import { MemoryStorage } from '../memory-storage.ts';
import { cardFileText } from './card-file.ts';
import { CHECK_DELAY_MS } from './checks.ts';
import { Drafts } from './drafts.ts';
import { builderPage, KIT_EVERY_MS, SAVE_DELAY_MS } from './page.ts';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const settled = () => wait(Math.max(CHECK_DELAY_MS, SAVE_DELAY_MS) + 60);
const PAGE = 'http://127.0.0.1:8650/?relay#/scenarios/builder';
const BASE = 'http://127.0.0.1:8650/pme-store/';
const at = () => {
  const u = new URL(PAGE);
  return { href: PAGE, protocol: u.protocol, host: u.host, hostname: u.hostname, origin: u.origin, pathname: u.pathname, search: u.search };
};

/** The kit's server, in memory: card id → its versions' texts; `status` what /pme-store/ answers. */
function kitServer(status: Record<string, unknown> = { store: 'pme', folder: 'user-data', writable: true }) {
  const cards = new Map<string, string[]>();
  const posts: string[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    const json = (v: unknown, code = 200) => new Response(JSON.stringify(v), { status: code });
    if (u === BASE) return json(status);
    if (!status.writable) return new Response('', { status: 404 });
    if (u === `${BASE}scenarios/`) return json({ cards: [...cards].map(([id, vs]) => ({ id, title: (JSON.parse(vs.at(-1)!) as { title: string }).title, versions: vs.map((t, i) => ({ v: i + 1, at: Date.UTC(2026, 10, 10, 9, i), bytes: t.length })) })) });
    const m = /scenarios\/([^/]+)(?:\/(\d+))?$/.exec(u);
    if (!m) return new Response('', { status: 404 });
    const id = decodeURIComponent(m[1]!);
    if (init?.method === 'POST') {
      const body = String(init.body);
      posts.push(id);
      if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(id)) return json({ refused: 'bad-request', why: `"${id}" cannot be a file name` }, 400);
      const vs = cards.get(id) ?? [];
      if (vs.at(-1) === body) return json({ v: vs.length, at: Date.now(), bytes: body.length, same: true });
      cards.set(id, [...vs, body]);
      return json({ v: vs.length + 1, at: Date.now(), bytes: body.length, same: false }, 201);
    }
    const text = cards.get(id)?.[Number(m[2]) - 1];
    return text === undefined ? new Response('', { status: 404 }) : new Response(text, { status: 200 });
  }) as typeof fetch;
  return { cards, posts, kit: () => new KitStore(at, () => f) };
}

describe('the builder keeps drafts in the kit’s user-data folder (layer 2)', () => {
  let b: { idb: MemoryIDB; ls: MemoryStorage };
  const store = () => new Drafts(() => b.ls, () => asFactory(b.idb));
  beforeEach(() => {
    b = { idb: new MemoryIDB(), ls: new MemoryStorage() };
  });
  afterEach(() => {
    document.body.replaceChildren();
    location.hash = '';
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  const mount = async (kit: KitStore, s = store(), sub = '') => {
    const p = builderPage(s, kit);
    document.body.append(p.el);
    await p.enter(sub);
    return { p, s, q: <T extends Element = HTMLElement>(sel: string) => p.el.querySelector<T>(sel)! };
  };
  const copyMh = async (kit: KitStore, s: Drafts) => {
    const { p } = await mount(kit, s);
    [...p.el.querySelectorAll<HTMLButtonElement>('.sb-start button')].find((x) => /Malignant hyperthermia \(phases\)/.test(x.getAttribute('aria-label') ?? ''))!.click();
    for (let i = 0; i < 40 && !location.hash.startsWith('#/scenarios/builder/d'); i++) await wait(5);
    p.el.remove();
    return location.hash.split('/').at(-1)!;
  };
  const ctrlS = () => dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true }));
  const until = async (pred: () => boolean) => {
    for (let i = 0; i < 100 && !pred(); i++) await wait(5);
    expect(pred()).toBe(true);
  };

  it('on: the store line says so; Ctrl+S keeps version 1, the same draft again writes nothing, an edit is version 2', async () => {
    const srv = kitServer();
    const s = store();
    const id = await copyMh(srv.kit(), s);
    const e = await mount(srv.kit(), s, id);
    expect(e.q('.sb-checks .sb-hint').textContent).toMatch(/^1 draft · 1 snapshot · \d+ kB, kept in this browser and in this kit’s user-data folder\.$/);
    expect(e.q('.sb-kit-save').hidden).toBe(false);
    expect(e.q('.sb-kit-save').textContent).toBe('Kit folder · not kept yet (Ctrl+S)');
    const ev = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true); // not the browser's "Save page as"
    await until(() => srv.cards.get('showcase-mh-v2-copy')?.length === 1);
    await until(() => /^Kit folder · version 1 kept \d\d:\d\d:\d\d$/.test(e.q('.sb-kit-save').textContent ?? ''));
    const v1 = srv.cards.get('showcase-mh-v2-copy')![0]!;
    expect(JSON.parse(v1)).toMatchObject({ id: 'showcase-mh-v2-copy', schema: 'pme-scenario/2' });
    expect(v1).toBe(cardFileText(JSON.parse(v1) as object)); // the card file, as Export writes it
    ctrlS();
    await until(() => srv.posts.length === 2);
    expect(srv.cards.get('showcase-mh-v2-copy')).toHaveLength(1);
    const title = [...e.p.el.querySelectorAll<HTMLElement>('.sb-page .field')].find((f) => f.querySelector('label, span')?.textContent === 'Title')!.querySelector('input')!;
    title.value = 'MH, kept in the kit';
    title.dispatchEvent(new Event('input'));
    await settled();
    ctrlS();
    await until(() => srv.cards.get('showcase-mh-v2-copy')?.length === 2);
    expect(JSON.parse(srv.cards.get('showcase-mh-v2-copy')![1]!)).toMatchObject({ title: 'MH, kept in the kit' });
    expect(srv.cards.get('showcase-mh-v2-copy')![0]).toBe(v1); // version 1 as it was
  });

  it('Export keeps a version too; every 2 min an open draft that changed is kept, an unchanged one is not', async () => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:test/0');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const srv = kitServer();
    const s = store();
    const id = await copyMh(srv.kit(), s);
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const e = await mount(srv.kit(), s, id);
    await settled();
    [...e.p.el.querySelectorAll<HTMLButtonElement>('button')].find((x) => x.textContent === 'Export file')!.click();
    await until(() => srv.cards.get('showcase-mh-v2-copy')?.length === 1);
    vi.advanceTimersByTime(KIT_EVERY_MS);
    await wait(50);
    expect(srv.posts).toHaveLength(1); // unchanged since Export: nothing sent
    const title = [...e.p.el.querySelectorAll<HTMLElement>('.sb-page .field')].find((f) => f.querySelector('label, span')?.textContent === 'Title')!.querySelector('input')!;
    title.value = 'MH, two minutes on';
    title.dispatchEvent(new Event('input'));
    await settled();
    vi.advanceTimersByTime(KIT_EVERY_MS);
    await until(() => srv.cards.get('showcase-mh-v2-copy')?.length === 2);
    expect(KIT_EVERY_MS).toBe(120_000);
  });

  it('the drafts page lists what the folder holds that this browser lacks, and opens it at its newest version', async () => {
    const srv = kitServer();
    const card = (title: string) => cardFileText({ schema: 'pme-scenario/2', id: 'kept-elsewhere', title });
    srv.cards.set('kept-elsewhere', [card('first'), card('Kept in another browser')]);
    const { p, q, s } = await mount(srv.kit());
    const block = q('[aria-labelledby="sb-kit-h"]');
    expect(block.hidden).toBe(false);
    expect(q('.sb-kit-cards').textContent).toContain('Kept in another browser kept-elsewhereVersion 2 · kept');
    expect(q('.sb-kit-cards').textContent).toContain('2 versions in the folder');
    [...p.el.querySelectorAll<HTMLButtonElement>('.sb-kit-cards button')][0]!.click();
    await until(() => location.hash.startsWith('#/scenarios/builder/d'));
    const m = s.list()[0]!;
    expect(m).toMatchObject({ cardId: 'kept-elsewhere', title: 'Kept in another browser', from: 'from this kit’s user-data folder, version 2' });
    expect(await s.body(m.id)).toEqual(JSON.parse(card('Kept in another browser')));
    // this browser has it now: the list no longer offers it
    const again = await mount(srv.kit(), s);
    expect(again.q('[aria-labelledby="sb-kit-h"]').hidden).toBe(true);
  });

  it('a card id the folder cannot take: not kept there, and the page says why and to export', async () => {
    const srv = kitServer();
    const s = store();
    const id = await copyMh(srv.kit(), s);
    const e = await mount(srv.kit(), s, id);
    const cardId = [...e.p.el.querySelectorAll<HTMLElement>('.sb-page .field')].find((f) => f.querySelector('label, span')?.textContent === 'Card id')!.querySelector('input')!;
    cardId.value = 'MH copy';
    cardId.dispatchEvent(new Event('input'));
    await settled();
    ctrlS();
    await until(() => !e.q('.sb-kit-refuse').hidden);
    expect(e.q('.sb-kit-refuse').textContent).toBe('Not kept in this kit’s user-data folder: "MH copy" cannot be a file name. The draft is still kept in this browser; export a file to keep it elsewhere.');
    expect(e.q('.sb-kit-save').textContent).toBe('Kit folder · not kept');
    expect(srv.cards.size).toBe(0);
  });

  it('off: nothing is sent, the kit chip is not shown, the store line says why and to export a file', async () => {
    for (const [status, words] of [
      [{ store: 'pme', folder: 'user-data', writable: false, refused: 'not-writable', why: 'the disk it is on is read-only' }, 'Not kept in a kit’s user-data folder: the folder cannot be written (the disk it is on is read-only; a read-only disk or a locked USB stick, for example). Export a file to keep this work.'],
      [{}, 'Not kept in a kit’s user-data folder: the app is not running from a kit. Export a file to keep this work.'],
    ] as const) {
      const srv = kitServer(status as Record<string, unknown>);
      const s = store();
      const id = await copyMh(srv.kit(), s);
      const e = await mount(srv.kit(), s, id);
      expect(e.q('.sb-checks .sb-hint').textContent).toMatch(/kept in this browser \(not in another browser, and not after this site’s data is cleared\): export a card to keep it elsewhere\. (.*)$/);
      expect(e.q('.sb-checks .sb-hint').textContent?.endsWith(words)).toBe(true);
      expect(e.q('.sb-kit-save').hidden).toBe(true);
      ctrlS();
      await wait(50);
      expect(srv.posts).toEqual([]);
      document.body.replaceChildren();
    }
  });
});
