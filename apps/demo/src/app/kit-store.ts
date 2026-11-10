// The kit store from the page's side (docs/plans/scenario-builder.md §8 layer 2; the owner's ruling of 10 November
// 2026): when the app runs from a kit started on Node.js, the kit's server keeps the clinicians' work as plain files in
// the kit's own `user-data` folder (packages/controller/relay/store.ts answers `/pme-store/`). The browser's copy is
// then the working copy, not the only one. Where the store is not there, nothing is written anywhere else, and the page
// says why in words and to export a file: the kit was started without Node.js (a fallback server: ruby, perl or python,
// which answer no /pme-store/; the kit's `app/pme-kit.json` tells a kit from another site), its folder cannot be
// written (a read-only disk), the page is on another device, or the app is not running from a kit. No DOM.
import { relayOf, type PageLocation } from './classroom.ts';

/** Why the kit store is off. */
export type KitOff = 'not-a-kit' | 'no-node' | 'not-writable' | 'not-this-computer';
export type KitState = { on: true; base: string; folder: string } | { on: false; why: KitOff; detail?: string };

/** One version of a card in the folder (store.ts `VersionMeta`). */
export interface KitVersion {
  v: number;
  at: number;
  bytes: number;
}
/** A card in the folder (store.ts `CardEntry`). */
export interface KitCard {
  id: string;
  title: string;
  versions: KitVersion[];
}

/** How long a probe or a read waits for the kit's server. [ENG: network] */
export const KIT_TIMEOUT_MS = 3000;

/** Where the store is: the relay's own address when the page names one (the classroom kit), else the page's own server
 *  (Start Simulator's serve.mjs). */
export function storeBase(loc: PageLocation & { href: string }): string {
  const relay = relayOf(loc);
  return relay ? `${relay.replace(/^ws/, 'http').replace(/\/?$/, '/')}pme-store/` : new URL('pme-store/', loc.href).href;
}

/** Where the work is kept, for a page's store line ("Kept …"), in the same words wherever the app says it. */
export function kitWhere(s: KitState | null): string {
  return s?.on ? 'in this browser and in this kit’s user-data folder' : 'in this browser only';
}

/** Why the kit's folder is not written, with the way out, or '' when it is. */
export function kitOffLine(s: KitState | null): string {
  if (!s || s.on) return '';
  const why = s.why === 'no-node'
    ? 'this kit was started without Node.js (its fallback server: ruby, perl or python), and only the kit’s Node.js server writes the folder'
    : s.why === 'not-writable'
      ? `the folder cannot be written (${s.detail ?? 'the system refused'}; a read-only disk or a locked USB stick, for example)`
      : s.why === 'not-this-computer'
        ? 'this page is not on the kit’s own computer, and only that computer writes to its folder'
        : 'the app is not running from a kit';
  return `Not kept in a kit’s user-data folder: ${why}. Export a file to keep this work.`;
}

type Fetch = typeof fetch;
const timeout = (): { signal?: AbortSignal } => (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? { signal: AbortSignal.timeout(KIT_TIMEOUT_MS) } : {});

export class KitStore {
  state: KitState | null = null;
  private probing: Promise<KitState> | null = null;
  private readonly loc: () => PageLocation & { href: string };
  private readonly fetchFn: () => Fetch;

  constructor(loc: () => PageLocation & { href: string } = () => location, fetchFn: () => Fetch = () => fetch) {
    this.loc = loc;
    this.fetchFn = fetchFn;
  }

  /** The store's state, asked once. */
  ready(): Promise<KitState> {
    this.probing ??= this.probe().catch((): KitState => ({ on: false, why: 'not-a-kit' })).then((s) => (this.state = s));
    return this.probing;
  }

  private async probe(): Promise<KitState> {
    const loc = this.loc();
    const base = storeBase(loc);
    try {
      const r = await this.fetchFn()(base, { cache: 'no-store', ...timeout() });
      const j = (await r.json()) as { store?: unknown; folder?: unknown; writable?: unknown; refused?: unknown; why?: unknown };
      if (j.store === 'pme') {
        if (j.writable === true) return { on: true, base, folder: typeof j.folder === 'string' ? j.folder : 'user-data' };
        return { on: false, why: j.refused === 'not-this-computer' ? 'not-this-computer' : 'not-writable', ...(typeof j.why === 'string' ? { detail: j.why } : {}) };
      }
    } catch {
      /* no store here: is this a kit? */
    }
    try {
      const r = await this.fetchFn()(new URL('pme-kit.json', loc.href).href, { cache: 'no-store', ...timeout() });
      if (r.ok && ((await r.json()) as { kit?: unknown }).kit === true) return { on: false, why: 'no-node' };
    } catch {
      /* not a kit */
    }
    return { on: false, why: 'not-a-kit' };
  }

  /** The cards the folder holds, or null when the store is off or does not answer. */
  async cards(): Promise<KitCard[] | null> {
    const s = await this.ready();
    if (!s.on) return null;
    try {
      const j = (await (await this.fetchFn()(`${s.base}scenarios/`, { cache: 'no-store', ...timeout() })).json()) as { cards?: unknown };
      return Array.isArray(j.cards) ? (j.cards as KitCard[]) : null;
    } catch {
      return null;
    }
  }

  /** Version `v` of card `id`, as its file's text, or null. */
  async card(id: string, v: number): Promise<string | null> {
    const s = await this.ready();
    if (!s.on) return null;
    try {
      const r = await this.fetchFn()(`${s.base}scenarios/${encodeURIComponent(id)}/${v}`, { cache: 'no-store', ...timeout() });
      return r.ok ? await r.text() : null;
    } catch {
      return null;
    }
  }

  /** `text` (a card file) kept as a new version of card `id`; the same bytes as its newest version write nothing. */
  async keepCard(id: string, text: string): Promise<({ ok: true; same: boolean } & KitVersion) | { ok: false; why: string }> {
    const s = await this.ready();
    if (!s.on) return { ok: false, why: kitOffLine(s) };
    try {
      const r = await this.fetchFn()(`${s.base}scenarios/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text, cache: 'no-store', ...timeout() });
      const j = (await r.json()) as { v?: number; at?: number; bytes?: number; same?: boolean; why?: string };
      if (r.ok && typeof j.v === 'number') return { ok: true, v: j.v, at: j.at ?? Date.now(), bytes: j.bytes ?? 0, same: !!j.same };
      return { ok: false, why: j.why ?? `the kit’s server answered ${r.status}` };
    } catch (e) {
      return { ok: false, why: `the kit’s server did not answer (${e instanceof Error ? e.message : String(e)})` };
    }
  }
}

/** The app's one kit store. */
export const kitStore = new KitStore();
