// The kit store from the page's side (kit-store.ts): where the store is, what the page is told about it in each case,
// and the words the builder and the archive say. The server's side is packages/controller/test/relay/kit-store.test.ts.
import { describe, expect, it } from 'vitest';
import { KitStore, kitOffLine, kitWhere, storeBase } from './kit-store.ts';

const at = (href: string) => {
  const u = new URL(href);
  return { href, protocol: u.protocol, host: u.host, hostname: u.hostname, origin: u.origin, pathname: u.pathname, search: u.search };
};
/** A fetch that answers `routes[url]` (a JSON value, or a status), else 404; `seen` lists what was asked. */
function fakeFetch(routes: Record<string, unknown>) {
  const seen: string[] = [];
  const f = (async (url: string | URL | Request) => {
    const u = String(url);
    seen.push(u);
    if (!(u in routes)) return new Response('Not found', { status: 404 });
    const r = routes[u];
    if (r instanceof Error) throw r;
    return new Response(typeof r === 'string' ? r : JSON.stringify(r), { status: 200 });
  }) as typeof fetch;
  return { f, seen };
}

describe('where the kit store is', () => {
  it('the relay the page names (the classroom kit, ?relay), else the page\'s own server (Start Simulator)', () => {
    expect(storeBase(at('http://127.0.0.1:8650/?relay#/scenarios/builder'))).toBe('http://127.0.0.1:8650/pme-store/');
    expect(storeBase(at('http://127.0.0.1:5173/?relay=ws%3A%2F%2F127.0.0.1%3A9811%2F#/'))).toBe('http://127.0.0.1:9811/pme-store/');
    expect(storeBase(at('http://127.0.0.1:8642/#/scenarios/builder'))).toBe('http://127.0.0.1:8642/pme-store/');
    expect(storeBase(at('http://127.0.0.1:8642/index.html#/'))).toBe('http://127.0.0.1:8642/pme-store/');
  });
});

describe('what the page is told, in each case', () => {
  const page = 'http://127.0.0.1:8650/?relay#/scenarios/builder';
  const store = (routes: Record<string, unknown>, href = page) => {
    const { f, seen } = fakeFetch(routes);
    return { k: new KitStore(() => at(href), () => f), seen };
  };
  it('on: the kit\'s Node.js server answers and may write', async () => {
    const { k } = store({ 'http://127.0.0.1:8650/pme-store/': { store: 'pme', folder: 'user-data', writable: true } });
    expect(await k.ready()).toEqual({ on: true, base: 'http://127.0.0.1:8650/pme-store/', folder: 'user-data' });
  });
  it('the folder cannot be written (a read-only disk): off, with the system\'s reason', async () => {
    const { k } = store({ 'http://127.0.0.1:8650/pme-store/': { store: 'pme', folder: 'user-data', writable: false, refused: 'not-writable', why: 'the disk it is on is read-only' } });
    expect(await k.ready()).toEqual({ on: false, why: 'not-writable', detail: 'the disk it is on is read-only' });
  });
  it('another device (a page on the laptop\'s network address): off, not this computer', async () => {
    const { k } = store({ 'http://192.168.1.10:8650/pme-store/': { store: 'pme', folder: 'user-data', writable: false, refused: 'not-this-computer', why: 'x' } }, 'http://192.168.1.10:8650/?relay#/');
    expect((await k.ready()).on).toBe(false);
    expect(k.state).toMatchObject({ why: 'not-this-computer' });
  });
  it('a kit on a fallback server (ruby, perl, python: no /pme-store/, but the kit\'s pme-kit.json): off, no Node.js', async () => {
    const { k, seen } = store({ 'http://127.0.0.1:8642/pme-kit.json': { kit: true } }, 'http://127.0.0.1:8642/#/scenarios/builder');
    expect(await k.ready()).toEqual({ on: false, why: 'no-node' });
    expect(seen).toEqual(['http://127.0.0.1:8642/pme-store/', 'http://127.0.0.1:8642/pme-kit.json']);
  });
  it('not a kit (a dev server, the hosted site, a relay without a state folder, a relay that does not answer): off, not a kit', async () => {
    for (const routes of [{}, { 'http://127.0.0.1:8650/pme-store/': '<!doctype html>' }, { 'http://127.0.0.1:8650/pme-store/': new TypeError('Failed to fetch') }]) {
      expect(await store(routes).k.ready()).toEqual({ on: false, why: 'not-a-kit' });
    }
  });
  it('asked once; off, no read or write is sent', async () => {
    const { k, seen } = store({});
    await k.ready();
    await k.ready();
    expect(await k.cards()).toBeNull();
    expect(await k.card('a', 1)).toBeNull();
    expect(await k.keepCard('a', '{}')).toEqual({ ok: false, why: expect.stringContaining('the app is not running from a kit') });
    expect(seen).toEqual(['http://127.0.0.1:8650/pme-store/', 'http://127.0.0.1:8650/pme-kit.json']);
  });
});

describe('the words', () => {
  it('where the work is kept, and why the folder is not written, with the way out', () => {
    expect(kitWhere({ on: true, base: '', folder: 'user-data' })).toBe('in this browser and in this kit’s user-data folder');
    expect(kitWhere({ on: false, why: 'not-a-kit' })).toBe('in this browser only');
    expect(kitOffLine({ on: true, base: '', folder: 'user-data' })).toBe('');
    expect(kitOffLine({ on: false, why: 'no-node' })).toBe('Not kept in a kit’s user-data folder: this kit was started without Node.js (its fallback server: ruby, perl or python), and only the kit’s Node.js server writes the folder. Export a file to keep this work.');
    expect(kitOffLine({ on: false, why: 'not-writable', detail: 'the disk it is on is read-only' })).toBe('Not kept in a kit’s user-data folder: the folder cannot be written (the disk it is on is read-only; a read-only disk or a locked USB stick, for example). Export a file to keep this work.');
    expect(kitOffLine({ on: false, why: 'not-this-computer' })).toBe('Not kept in a kit’s user-data folder: this page is not on the kit’s own computer, and only that computer writes to its folder. Export a file to keep this work.');
    expect(kitOffLine({ on: false, why: 'not-a-kit' })).toBe('Not kept in a kit’s user-data folder: the app is not running from a kit. Export a file to keep this work.');
  });
});
