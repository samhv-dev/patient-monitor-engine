// Stage 12 (the classroom): learners' phones follow the instructor's session over the relay (`pme-relay --static`),
// which serves this app on the laptop's network address. No DOM here: the QR panel, the learner page and their tests
// read these. The QR carries ONE short address, `http://<laptop>:<port>/?join=<CODE>` — the page's relay is the page's
// own host — so the symbol stays small enough to scan from the back of a lecture room.
import { normalizeSessionCode } from '@pme/controller';

export interface PageLocation {
  protocol: string;
  host: string;
  hostname: string;
  origin: string;
  pathname: string;
  search: string;
}

/** What `/pme-relay.json` answers (packages/controller/relay/http.ts `RelayInfo`). */
export interface RelayInfo {
  relay: 'pme';
  port: number;
  addresses: string[];
  serves: boolean;
}

/** Loopback hosts: an address on them works on this computer only. */
export const LOOPBACK = /^(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?|0\.0\.0\.0)$/i;

/** The session a learner's phone joins (`?join=CODE`), or null. */
export const joinCode = (loc: Pick<PageLocation, 'search'>): string | null => normalizeSessionCode(new URLSearchParams(loc.search).get('join') ?? '');

/**
 * The relay this page talks to: `?relay=ws://…` as given; `?relay` with no value, or a learner page (`?join=`) without
 * one, means the page's own host (the relay serves the app). Null: no relay (same-browser windows only).
 */
export function relayOf(loc: PageLocation): string | null {
  const q = new URLSearchParams(loc.search);
  const given = q.get('relay');
  if (given) return given;
  if (given === null && !q.has('join')) return null;
  return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/`;
}

/** The learner's address for the QR code: `<origin><path>?join=CODE`, plus the relay only when it is elsewhere. */
export function learnerUrl(code: string, origin: string, pathname: string, relay: string | null): string {
  const own = `${origin.replace(/^http/, 'ws')}/`;
  return `${origin}${pathname}?join=${code}${relay && relay !== own ? `&relay=${encodeURIComponent(relay)}` : ''}`;
}

/** `others`: the learner address on this computer's other networks (shown under the code, for a phone the QR fails). */
export type QrTarget = { ok: true; url: string; origin: string; others: string[] } | { ok: false; why: string };

/**
 * Where phones open the learner monitor: the relay's network address when it serves the app (the instructor's page
 * may itself run on 127.0.0.1), else this page's own address if another device can reach it. A page on https cannot
 * hand phones a ws:// relay (browsers block it), and a loopback-only page is unreachable: both say why instead.
 */
export function qrTarget(code: string, loc: PageLocation, relay: string | null, info: RelayInfo | null): QrTarget {
  if (!relay) return { ok: false, why: 'No relay is running: learners can follow on a second screen in this browser only.' };
  if (!info) return { ok: false, why: 'The relay does not answer: start the classroom (Start Classroom) and reload this page.' };
  if (info.serves) {
    const a = info.addresses[0];
    if (!a) return { ok: false, why: 'This computer is on no network: join the venue Wi-Fi or turn on the hotspot, then reload this page.' };
    const origin = `http://${a}:${info.port}`;
    return { ok: true, url: learnerUrl(code, origin, '/', null), origin, others: info.addresses.slice(1).map((x) => learnerUrl(code, `http://${x}:${info.port}`, '/', null)) };
  }
  if (LOOPBACK.test(loc.hostname)) return { ok: false, why: 'This address works on this computer only: start the relay with --static (Start Classroom).' };
  if (loc.protocol === 'https:' && relay.startsWith('ws:')) return { ok: false, why: 'A secure (https) page cannot send phones to a ws:// relay.' };
  return { ok: true, url: learnerUrl(code, loc.origin, loc.pathname, relay), origin: loc.origin, others: [] };
}

/** The relay's own description, from its http side; null when it does not answer within `ms`. */
export async function relayInfo(relay: string, ms = 2000, fetchFn: typeof fetch = fetch): Promise<RelayInfo | null> {
  const url = `${relay.replace(/^ws/, 'http').replace(/\/?$/, '/')}pme-relay.json`;
  try {
    const r = await fetchFn(url, { signal: AbortSignal.timeout(ms), cache: 'no-store' });
    const j = (await r.json()) as Partial<RelayInfo>;
    return j.relay === 'pme' && typeof j.port === 'number' && Array.isArray(j.addresses) ? (j as RelayInfo) : null;
  } catch {
    return null;
  }
}
